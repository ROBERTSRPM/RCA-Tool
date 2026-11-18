/**
 * The only place that talks to the Anthropic API. Server-side only: it reads
 * ANTHROPIC_API_KEY from the environment and is never imported by client code.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
/** Give up after this long, so the route finishes inside the platform's function limit. */
export const REQUEST_TIMEOUT_MS = 50_000;

export type AiErrorCode = "not_configured" | "timeout" | "busy" | "unavailable" | "unusable";

/** A failure with a code the handler maps to a friendly message. Never carries API detail. */
export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    /** Status or error class for the server log only. */
    public detail = "",
  ) {
    super(code);
    this.name = "AiError";
  }
}

export function getModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasApiKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY?.trim());
}

/** Effort is only sent to the model generation that supports it; AI_EFFORT overrides. */
export function getEffort(model: string, env: NodeJS.ProcessEnv = process.env): "low" | "medium" | "high" | null {
  const o = env.AI_EFFORT?.trim();
  if (o === "low" || o === "medium" || o === "high") return o;
  return /^claude-(sonnet|opus|haiku|fable|mythos)-5/.test(model) ? "medium" : null;
}

export interface ModelCall {
  instructions: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
  }
  return client;
}

/** Test hook: drop the cached client so a mocked SDK is picked up. */
export function resetClientForTests(): void {
  client = null;
}

export function classifyError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const e = err as { name?: string; status?: number } | null;
  const name = e?.name ?? "";
  const status = typeof e?.status === "number" ? e.status : 0;
  if (name === "APIConnectionTimeoutError" || /timeout|abort/i.test(name)) return new AiError("timeout", name);
  if (status === 429 || status === 529 || status === 503) return new AiError("busy", String(status));
  if (status === 401 || status === 403) return new AiError("not_configured", String(status));
  return new AiError("unavailable", status ? String(status) : name || "error");
}

/** Calls the model and returns its parsed JSON answer (still unvalidated). */
export async function callModel(call: ModelCall): Promise<unknown> {
  if (!hasApiKey()) throw new AiError("not_configured", "no key");
  const model = getModel();
  const effort = getEffort(model);
  let res: Anthropic.Message;
  try {
    res = await getClient().messages.create({
      model,
      max_tokens: call.maxTokens,
      // The long method prompt is the same for every call: cache it. Feature text comes after it.
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: call.instructions },
      ],
      messages: [{ role: "user", content: call.user }],
      output_config: {
        format: { type: "json_schema", schema: call.schema },
        ...(effort ? { effort } : {}),
      },
    });
  } catch (err) {
    throw classifyError(err);
  }
  if (res.stop_reason === "refusal") throw new AiError("unusable", "refusal");
  if (res.stop_reason === "max_tokens") throw new AiError("unusable", "max_tokens");
  const textOut = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(textOut);
  } catch {
    throw new AiError("unusable", "json");
  }
}
