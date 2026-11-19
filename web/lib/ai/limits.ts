/**
 * Per-user usage limits. The counting itself happens in the database
 * (function public.ai_consume, which inserts one row per call and checks the
 * daily and burst limits under a per-user lock). This file reads the
 * configured limits and turns the database answer into a decision.
 */
import { BRAND_NAME } from "../brand";

export interface Limits {
  /** Calls allowed in any rolling 24 hours. */
  daily: number;
  /** Calls allowed in any rolling 60 seconds. */
  burst: number;
  /** Calls allowed across all users in any rolling 24 hours (spending cap). */
  global: number;
}

export const DEFAULT_LIMITS: Limits = { daily: 30, burst: 5, global: 300 };

function intEnv(v: string | undefined, d: number, min: number, max: number): number {
  const n = v === undefined || v.trim() === "" ? NaN : Number(v);
  if (!Number.isInteger(n)) return d;
  return Math.min(max, Math.max(min, n));
}

export function readLimits(env: NodeJS.ProcessEnv = process.env): Limits {
  return {
    daily: intEnv(env.AI_DAILY_LIMIT, DEFAULT_LIMITS.daily, 1, 1000),
    burst: intEnv(env.AI_BURST_LIMIT, DEFAULT_LIMITS.burst, 1, 60),
    global: intEnv(env.AI_GLOBAL_DAILY_LIMIT, DEFAULT_LIMITS.global, 1, 1_000_000),
  };
}

export type ConsumeDecision =
  | { allowed: true; remainingToday: number; usageId: number | null; refundTicket: string | null }
  | { allowed: false; reason: "daily" | "burst" | "global"; retryAfterSeconds: number };

/** Reads the jsonb the database function returns. Anything unexpected is an error, never "allowed". */
export function interpretConsume(raw: unknown): ConsumeDecision {
  if (typeof raw !== "object" || raw === null) throw new Error("bad limit answer");
  const r = raw as Record<string, unknown>;
  if (r.ok === true) {
    const rem = typeof r.remaining_today === "number" && Number.isFinite(r.remaining_today) ? r.remaining_today : 0;
    const id = typeof r.usage_id === "number" && Number.isInteger(r.usage_id) ? r.usage_id : null;
    const ticket = typeof r.refund_ticket === "string" && /^[0-9a-f-]{36}$/i.test(r.refund_ticket) ? r.refund_ticket : null;
    return { allowed: true, remainingToday: Math.max(0, Math.floor(rem)), usageId: id, refundTicket: ticket };
  }
  if (r.ok === false && (r.reason === "daily" || r.reason === "burst" || r.reason === "global")) {
    const s = typeof r.retry_after_seconds === "number" && Number.isFinite(r.retry_after_seconds) ? r.retry_after_seconds : 60;
    return { allowed: false, reason: r.reason, retryAfterSeconds: Math.min(86400, Math.max(1, Math.ceil(s))) };
  }
  throw new Error("bad limit answer");
}

export function limitMessage(d: Extract<ConsumeDecision, { allowed: false }>, limits: Limits): string {
  if (d.reason === "burst") {
    return `You are going a bit fast. Wait about ${Math.max(5, d.retryAfterSeconds)} seconds and try again.`;
  }
  const hours = Math.ceil(d.retryAfterSeconds / 3600);
  if (d.reason === "global") {
    return `AI suggestions are very busy today and have reached the daily limit for everyone. Please try again ${hours <= 1 ? "in about an hour" : `in about ${hours} hours`}. Everything else in ${BRAND_NAME} keeps working.`;
  }
  return `You have used ${limits.daily === 1 ? "your" : `all ${limits.daily}`} AI ${limits.daily === 1 ? "suggestion" : "suggestions"} for today. You can use AI again in about ${hours} ${hours === 1 ? "hour" : "hours"}. Everything else in ${BRAND_NAME} keeps working.`;
}
