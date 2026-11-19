import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, interpretConsume, limitMessage, readLimits } from "./limits";

describe("readLimits", () => {
  it("defaults to 30 a day and 5 a minute", () => {
    expect(readLimits({} as NodeJS.ProcessEnv)).toEqual({ daily: 30, burst: 5, global: 300 });
    expect(DEFAULT_LIMITS).toEqual({ daily: 30, burst: 5, global: 300 });
  });
  it("reads overrides, ignores junk, clamps", () => {
    expect(readLimits({ AI_DAILY_LIMIT: "50", AI_BURST_LIMIT: "3" } as unknown as NodeJS.ProcessEnv)).toEqual({ daily: 50, burst: 3, global: 300 });
    expect(readLimits({ AI_DAILY_LIMIT: "lots", AI_BURST_LIMIT: "" } as unknown as NodeJS.ProcessEnv)).toEqual({ daily: 30, burst: 5, global: 300 });
    expect(readLimits({ AI_DAILY_LIMIT: "0", AI_BURST_LIMIT: "9999" } as unknown as NodeJS.ProcessEnv)).toEqual({ daily: 1, burst: 60, global: 300 });
    expect(readLimits({ AI_DAILY_LIMIT: "2.5" } as unknown as NodeJS.ProcessEnv).daily).toBe(30);
  });
});

describe("interpretConsume", () => {
  it("allowed", () => {
    expect(interpretConsume({ ok: true, remaining_today: 12, usage_id: 5 })).toEqual({ allowed: true, remainingToday: 12, usageId: 5, refundTicket: null });
    expect(interpretConsume({ ok: true, remaining_today: -3 })).toEqual({ allowed: true, remainingToday: 0, usageId: null, refundTicket: null });
  });
  it("global cap is configurable", () => {
    expect(readLimits({ AI_GLOBAL_DAILY_LIMIT: "50" } as unknown as NodeJS.ProcessEnv).global).toBe(50);
    expect(readLimits({ AI_GLOBAL_DAILY_LIMIT: "x" } as unknown as NodeJS.ProcessEnv).global).toBe(300);
  });
  it("reads the refund ticket and the global refusal", () => {
    const t = "11111111-2222-3333-4444-555555555555";
    expect(interpretConsume({ ok: true, remaining_today: 1, usage_id: 2, refund_ticket: t })).toEqual({ allowed: true, remainingToday: 1, usageId: 2, refundTicket: t });
    expect(interpretConsume({ ok: true, remaining_today: 1, usage_id: 2, refund_ticket: "<script>" })).toMatchObject({ refundTicket: null });
    expect(interpretConsume({ ok: false, reason: "global", retry_after_seconds: 60 })).toMatchObject({ allowed: false, reason: "global" });
  });
  it("refused: daily and burst", () => {
    expect(interpretConsume({ ok: false, reason: "daily", retry_after_seconds: 3600.2 })).toEqual({ allowed: false, reason: "daily", retryAfterSeconds: 3601 });
    expect(interpretConsume({ ok: false, reason: "burst" })).toEqual({ allowed: false, reason: "burst", retryAfterSeconds: 60 });
  });
  it("anything unexpected throws, never allows", () => {
    for (const bad of [null, undefined, "ok", {}, { ok: "true" }, { ok: false, reason: "other" }, []]) {
      expect(() => interpretConsume(bad)).toThrow();
    }
  });
});

describe("limitMessage", () => {
  it("is friendly and says what keeps working", () => {
    const daily = limitMessage({ allowed: false, reason: "daily", retryAfterSeconds: 7200 }, DEFAULT_LIMITS);
    expect(daily).toContain("30");
    expect(daily).toContain("2 hours");
    expect(daily).toContain("keeps working");
    expect(limitMessage({ allowed: false, reason: "burst", retryAfterSeconds: 20 }, DEFAULT_LIMITS)).toContain("20 seconds");
    expect(limitMessage({ allowed: false, reason: "daily", retryAfterSeconds: 100 }, DEFAULT_LIMITS)).toContain("1 hour.");
  });
  it("uses the right singular and plural", () => {
    const one = limitMessage({ allowed: false, reason: "daily", retryAfterSeconds: 100 }, { daily: 1, burst: 5, global: 300 });
    expect(one).toContain("your AI suggestion for today");
    expect(one).not.toContain("suggestions");
    expect(limitMessage({ allowed: false, reason: "daily", retryAfterSeconds: 100 }, { daily: 30, burst: 5, global: 300 })).toContain("all 30 AI suggestions");
  });
});
