/**
 * Shared route handler for /api/ai/<feature>. The order matters:
 * size check -> parse -> verify the Supabase session -> is AI configured ->
 * validate the input -> count the call against the user's limits -> call the
 * model -> validate its answer. Errors reach the browser only as a code and a
 * friendly message: never an API error, key or stack trace, and the
 * investigation content is never logged.
 */
import { BRAND_NAME } from "../brand";
import { AiError, callModel, hasApiKey, type ModelCall } from "./anthropic";
import { limitMessage, readLimits, type ConsumeDecision, type Limits } from "./limits";
import { isMockEnabled, mockModel } from "./mock";
import { buildPrompt, makeAliases } from "./prompts";
import {
  validateCapa,
  validateChallenge,
  cleanResult,
  validateCoach,
  validateDocument,
  validateProblem,
} from "./output";
import { parseRequest, type AiFeature, type AiRequest } from "./requests";
import { CAPA_SCHEMA, CHALLENGE_SCHEMA, COACH_SCHEMA, DOCUMENT_SCHEMA, PROBLEM_SCHEMA } from "./schemas";
import { consumeCall, refundCall, verifyUser } from "./supabase-server";

export const MAX_BODY_BYTES = 120_000;

export interface Deps {
  verifyUser(token: string): Promise<{ id: string } | null>;
  consume(token: string, feature: string, limits: Limits): Promise<ConsumeDecision>;
  /** Gives back a counted call that failed (daily allowance only; burst still counts). */
  refund(token: string, usageId: number, ticket: string): Promise<void>;
  callModel(call: ModelCall, req: AiRequest): Promise<unknown>;
  hasKey(): boolean;
  limits(): Limits;
}

export const defaultDeps: Deps = {
  verifyUser,
  consume: consumeCall,
  refund: refundCall,
  callModel: (call, req) => (isMockEnabled() ? mockModel(req) : callModel(call)),
  hasKey: () => isMockEnabled() || hasApiKey(),
  limits: () => readLimits(),
};

export type ErrorCode =
  | "bad_request"
  | "too_large"
  | "signin"
  | "not_configured"
  | "daily_limit"
  | "burst_limit"
  | "global_limit"
  | "timeout"
  | "busy"
  | "unavailable"
  | "unusable";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  too_large: 413,
  signin: 401,
  not_configured: 503,
  daily_limit: 429,
  burst_limit: 429,
  global_limit: 429,
  timeout: 504,
  busy: 503,
  unavailable: 502,
  unusable: 502,
};

const MESSAGES: Record<Exclude<ErrorCode, "bad_request" | "daily_limit" | "burst_limit" | "global_limit">, string> = {
  too_large: "That is too much to send to the AI. Shorten some long notes and try again.",
  signin: "Sign in to use AI.",
  not_configured: `AI is not switched on for this site yet. Everything else in ${BRAND_NAME} still works.`,
  timeout: "The AI took too long to answer. Try again in a moment.",
  busy: "The AI service is busy right now. Try again in a minute.",
  unavailable: `The AI is not available right now. Everything else in ${BRAND_NAME} still works.`,
  unusable: "The AI gave an answer that could not be used. Try again.",
};

function fail(code: ErrorCode, message?: string, extra: Record<string, string> = {}): Response {
  const text = message ?? MESSAGES[code as keyof typeof MESSAGES] ?? "Something went wrong.";
  return Response.json(
    { error: { code, message: text } },
    { status: STATUS[code], headers: { "Cache-Control": "no-store", ...extra } },
  );
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})$/.exec(h.trim());
  return m ? m[1] : null;
}

function modelCall(req: AiRequest): { call: ModelCall; validate: (raw: unknown) => unknown } {
  const aliases = makeAliases(req.context);
  const m = modelCallRaw(req, aliases);
  return { call: m.call, validate: (raw) => cleanResult(m.validate(raw), aliases) };
}

function modelCallRaw(req: AiRequest, aliases: ReturnType<typeof makeAliases>): { call: ModelCall; validate: (raw: unknown) => unknown } {
  const p = buildPrompt(req, aliases);
  const base = { instructions: p.instructions, user: p.user, maxTokens: p.maxTokens };
  switch (req.feature) {
    case "coach":
      return {
        call: { ...base, schema: COACH_SCHEMA },
        validate: (raw) => validateCoach(raw, aliases, req.scope, req.nodeId),
      };
    case "challenge":
      return { call: { ...base, schema: CHALLENGE_SCHEMA }, validate: (raw) => validateChallenge(raw, aliases) };
    case "capa":
      return { call: { ...base, schema: CAPA_SCHEMA }, validate: validateCapa };
    case "draft":
      return req.kind === "problem"
        ? { call: { ...base, schema: PROBLEM_SCHEMA }, validate: validateProblem }
        : {
            call: { ...base, schema: DOCUMENT_SCHEMA },
            validate: (raw) => validateDocument(raw, req.kind as "report" | "summary"),
          };
  }
}

export async function handleAiRequest(feature: AiFeature, request: Request, deps: Deps = defaultDeps): Promise<Response> {
  // 1. Size and shape of the body.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return fail("too_large");
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) return fail("too_large");
    raw = JSON.parse(body);
  } catch {
    return fail("bad_request", "The request was not valid.");
  }

  // 2. Who is asking: verified with Supabase, never trusted from the browser.
  const token = bearer(request);
  if (!token) return fail("signin");
  let user: { id: string } | null;
  try {
    user = await deps.verifyUser(token);
  } catch {
    return fail("unavailable");
  }
  if (!user) return fail("signin");

  // 3. Is AI switched on at all (no quota is used if not).
  if (!deps.hasKey()) return fail("not_configured");

  // 4. Validate and size-limit the input before spending anything.
  const parsed = parseRequest(feature, raw);
  if (!parsed.ok) return fail("bad_request", parsed.message);

  // 5. Per-user limits.
  const limits = deps.limits();
  let decision: ConsumeDecision;
  try {
    decision = await deps.consume(token, feature, limits);
  } catch {
    console.error("[ai]", feature, "limit check failed");
    return fail("unavailable");
  }
  if (!decision.allowed) {
    const code = decision.reason === "daily" ? "daily_limit" : decision.reason === "global" ? "global_limit" : "burst_limit";
    return fail(code, limitMessage(decision, limits), {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }

  // 6. Ask the model, then check what came back.
  const { call, validate } = modelCall(parsed.value);
  let result: unknown;
  try {
    result = validate(await deps.callModel(call, parsed.value));
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("unavailable", "error");
    console.error("[ai]", feature, e.code, e.detail);
    if (decision.usageId !== null && decision.refundTicket) await deps.refund(token, decision.usageId, decision.refundTicket);
    return fail(e.code === "not_configured" ? "not_configured" : (e.code as ErrorCode));
  }
  if (result === null) {
    console.error("[ai]", feature, "unusable", "shape");
    if (decision.usageId !== null && decision.refundTicket) await deps.refund(token, decision.usageId, decision.refundTicket);
    return fail("unusable");
  }
  return Response.json(
    { result, remainingToday: decision.remainingToday },
    { headers: { "Cache-Control": "no-store" } },
  );
}
