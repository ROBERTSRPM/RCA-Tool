import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSample } from "../sample";
import { AiError } from "./anthropic";
import { buildAiContext } from "./context";
import { handleAiRequest, MAX_BODY_BYTES, type Deps } from "./handler";

const context = buildAiContext(buildSample());
const TOKEN = "a".repeat(40);

const validCoach = {
  suggestions: [{ parent: "N1", level: "system", text: "No alignment check in the rebuild procedure", why: "w", confirmWith: "c", ruleOutWith: "r", deterioration: "not_applicable" }],
};

function deps(over: Partial<Deps> = {}): Deps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    verifyUser: vi.fn(async () => ({ id: "u1" })),
    consume: vi.fn(async () => {
      calls.push("consume");
      return { allowed: true as const, remainingToday: 7 };
    }),
    callModel: vi.fn(async () => {
      calls.push("model");
      return validCoach;
    }),
    hasKey: () => true,
    limits: () => ({ daily: 30, burst: 5 }),
    ...over,
  };
}

const post = (body: unknown, headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` }) =>
  new Request("http://x/api/ai/coach", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const body = { context, scope: "tree" };
const errOf = async (r: Response) => (await r.json()).error as { code: string; message: string };

let d: ReturnType<typeof deps>;
beforeEach(() => {
  d = deps();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("handleAiRequest", () => {
  it("succeeds: validated result, remaining count, no-store", async () => {
    const r = await handleAiRequest("coach", post(body), d);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const j = await r.json();
    expect(j.remainingToday).toBe(7);
    expect(j.result.suggestions[0].parentId).toBe(context.nodes[0].id);
    expect(d.calls).toEqual(["consume", "model"]);
  });

  it("signed out: 401 'Sign in to use AI', nothing spent", async () => {
    const r = await handleAiRequest("coach", post(body, {}), d);
    expect(r.status).toBe(401);
    expect((await errOf(r)).message).toBe("Sign in to use AI.");
    expect(d.verifyUser).not.toHaveBeenCalled();
    expect(d.calls).toEqual([]);
  });

  it("bad or expired token: 401", async () => {
    d = deps({ verifyUser: vi.fn(async () => null) });
    const r = await handleAiRequest("coach", post(body), d);
    expect(r.status).toBe(401);
    expect(d.calls).toEqual([]);
  });

  it("malformed Authorization header is treated as signed out", async () => {
    const r = await handleAiRequest("coach", post(body, { authorization: "Basic abc" }), d);
    expect(r.status).toBe(401);
  });

  it("no API key: 503 and the quota is not used", async () => {
    d = deps({ hasKey: () => false });
    const r = await handleAiRequest("coach", post(body), d);
    expect(r.status).toBe(503);
    expect((await errOf(r)).code).toBe("not_configured");
    expect(d.calls).toEqual([]);
  });

  it("rejects bad JSON, oversized bodies and invalid input before spending quota", async () => {
    expect((await handleAiRequest("coach", post("{nope"), d)).status).toBe(400);
    expect((await handleAiRequest("coach", post({ ...body, scope: "x" }), d)).status).toBe(400);
    const big = await handleAiRequest("coach", post("x".repeat(MAX_BODY_BYTES + 1)), d);
    expect(big.status).toBe(413);
    const declared = await handleAiRequest("coach", post(body, { authorization: `Bearer ${TOKEN}`, "content-length": String(MAX_BODY_BYTES + 5) }), d);
    expect(declared.status).toBe(413);
    expect(d.calls).toEqual([]);
  });

  it("limit reached: 429 with Retry-After and a friendly message, model not called", async () => {
    d = deps({ consume: vi.fn(async () => ({ allowed: false as const, reason: "daily" as const, retryAfterSeconds: 7200 })) });
    const r = await handleAiRequest("coach", post(body), d);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("7200");
    const e = await errOf(r);
    expect(e.code).toBe("daily_limit");
    expect(e.message).toContain("30");
    expect(d.callModel).not.toHaveBeenCalled();

    d = deps({ consume: vi.fn(async () => ({ allowed: false as const, reason: "burst" as const, retryAfterSeconds: 30 })) });
    expect((await errOf(await handleAiRequest("coach", post(body), d))).code).toBe("burst_limit");
  });

  it("limit check failing closes the door (502), it does not let the call through", async () => {
    d = deps({ consume: vi.fn(async () => { throw new Error("db down"); }) });
    const r = await handleAiRequest("coach", post(body), d);
    expect(r.status).toBe(502);
    expect(d.callModel).not.toHaveBeenCalled();
  });

  it("model failures become friendly errors that leak nothing", async () => {
    const secret = "sk-ant-SECRET at Object.<anonymous> (/srv/app/node_modules/x.js:1:1)";
    for (const [err, status, code] of [
      [new AiError("timeout", "APIConnectionTimeoutError"), 504, "timeout"],
      [new AiError("busy", "429"), 503, "busy"],
      [new AiError("unusable", "json"), 502, "unusable"],
      [new AiError("not_configured", "401"), 503, "not_configured"],
      [new Error(secret), 502, "unavailable"],
    ] as const) {
      d = deps({ callModel: vi.fn(async () => { throw err; }) });
      const r = await handleAiRequest("coach", post(body), d);
      expect(r.status).toBe(status);
      const text = JSON.stringify(await r.json());
      expect(text).toContain(code);
      expect(text).not.toContain("sk-ant");
      expect(text).not.toContain("node_modules");
    }
  });

  it("does not log investigation content", async () => {
    const spy = vi.spyOn(console, "error");
    d = deps({ callModel: vi.fn(async () => { throw new AiError("unavailable", "500"); }) });
    await handleAiRequest("coach", post(body), d);
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain(context.problem.title);
    expect(logged).not.toContain(context.nodes[1].text);
  });

  it("a model answer in the wrong shape is rejected as unusable", async () => {
    d = deps({ callModel: vi.fn(async () => ({ suggestions: "lots" })) });
    const r = await handleAiRequest("coach", post(body), d);
    expect(r.status).toBe(502);
    expect((await errOf(r)).code).toBe("unusable");
  });

  it("builds the right prompt and schema per feature", async () => {
    const seen: { instructions: string; maxTokens: number; schema: Record<string, unknown> }[] = [];
    d = deps({ callModel: vi.fn(async (call) => { seen.push(call); return { summary: "ok", issues: [] }; }) });
    const r = await handleAiRequest("challenge", post({ context, focus: "all" }), d);
    expect(r.status).toBe(200);
    expect(seen[0].instructions).toContain("Challenge mode");
    expect(seen[0].maxTokens).toBeLessThanOrEqual(8000);
    expect(Object.keys(seen[0].schema.properties as object)).toEqual(["summary", "issues"]);
  });
});
