/**
 * Calls the model under test through the app's own callModel, with retries, and captures the token
 * usage the API reports (callModel itself returns only the parsed answer).
 *
 * Usage capture: the SDK sends requests with the global fetch. We wrap fetch once and, inside an
 * AsyncLocalStorage scope, add up the `usage` of every /v1/messages response. This leaves
 * lib/ai/anthropic.ts untouched, so the call is exactly the production one.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { AiError, callModel } from "../lib/ai/anthropic";
import { addUsage, fromApiUsage, zeroUsage, type Usage } from "./pricing";

const store = new AsyncLocalStorage<{ usage: Usage }>();
let patched = false;

export function installUsageCapture(): void {
  if (patched) return;
  patched = true;
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const res = await real(input, init);
    const acc = store.getStore();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    if (acc && res.ok && url.includes("/v1/messages")) {
      try {
        const body = (await res.clone().json()) as { usage?: unknown };
        if (body.usage) acc.usage = addUsage(acc.usage, fromApiUsage(body.usage));
      } catch {
        /* usage is best effort */
      }
    }
    return res;
  }) as typeof fetch;
}

export interface RetryOptions {
  attempts: number;
  baseMs: number;
  maxMs: number;
  sleep: (ms: number) => Promise<void>;
}
export const DEFAULT_RETRY: RetryOptions = {
  attempts: 6,
  baseMs: 1000,
  maxMs: 30_000,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/** 429 and 5xx (and network trouble, timeouts) are worth another try; 4xx and refusals are not. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof AiError) {
    if (err.code === "busy" || err.code === "timeout") return true;
    if (err.code === "unavailable") return !/^4\d\d$/.test(err.detail);
    return false;
  }
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number") return status === 408 || status === 409 || status === 429 || status >= 500;
  const name = (err as { name?: string } | null)?.name ?? "";
  return /Connection|Timeout|Abort/i.test(name);
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = DEFAULT_RETRY): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.attempts || !isRetryable(err)) throw err;
      const delay = Math.min(opts.maxMs, opts.baseMs * 2 ** (attempt - 1)) * (0.5 + Math.random() / 2);
      await opts.sleep(delay);
    }
  }
}

export type ModelOutcome =
  | { ok: true; raw: unknown; usage: Usage }
  | { ok: false; kind: "unusable" | "error"; code: string; detail: string; usage: Usage };

/** One production model call. "unusable" (refusal, cut-off, not JSON) is the model's failure; "error" is infrastructure. */
export async function runModel(call: Parameters<typeof callModel>[0], retry: RetryOptions = DEFAULT_RETRY): Promise<ModelOutcome> {
  const acc = { usage: zeroUsage() };
  try {
    const raw = await withRetry(() => store.run(acc, () => callModel(call)), retry);
    return { ok: true, raw, usage: acc.usage };
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("unavailable", (err as Error)?.name ?? "error");
    return { ok: false, kind: e.code === "unusable" ? "unusable" : "error", code: e.code, detail: e.detail, usage: acc.usage };
  }
}
