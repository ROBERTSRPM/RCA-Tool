import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const ctorArgs: unknown[] = [];
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
    constructor(opts: unknown) {
      ctorArgs.push(opts);
    }
  },
}));

import { AiError, callModel, classifyError, DEFAULT_MODEL, getEffort, getModel, hasApiKey, REQUEST_TIMEOUT_MS, resetClientForTests } from "./anthropic";
import { SYSTEM_PROMPT } from "./prompts";

const CALL = { instructions: "do it", user: "<investigation/>", schema: { type: "object" }, maxTokens: 1234 };
const reply = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text }] });

beforeEach(() => {
  create.mockReset();
  ctorArgs.length = 0;
  resetClientForTests();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_MODEL", "");
  vi.stubEnv("AI_EFFORT", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("config", () => {
  it("defaults the model and reads the override", () => {
    expect(getModel({} as NodeJS.ProcessEnv)).toBe("claude-sonnet-5-5");
    expect(DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    expect(getModel({ ANTHROPIC_MODEL: " claude-opus-5-5 " } as unknown as NodeJS.ProcessEnv)).toBe("claude-opus-5-5");
  });
  it("knows when there is no key", () => {
    expect(hasApiKey({} as NodeJS.ProcessEnv)).toBe(false);
    expect(hasApiKey({ ANTHROPIC_API_KEY: "  " } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(hasApiKey({ ANTHROPIC_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
  it("sends effort only to the generation that supports it", () => {
    expect(getEffort("claude-sonnet-5-5", {} as NodeJS.ProcessEnv)).toBe("medium");
    expect(getEffort("claude-sonnet-4-5", {} as NodeJS.ProcessEnv)).toBeNull();
    expect(getEffort("claude-sonnet-4-5", { AI_EFFORT: "low" } as unknown as NodeJS.ProcessEnv)).toBe("low");
  });
});

describe("callModel", () => {
  it("sends a cached system prompt, structured output, capped tokens and a timeout", async () => {
    create.mockResolvedValue(reply('{"a":1}'));
    expect(await callModel(CALL)).toEqual({ a: 1 });
    const args = create.mock.calls[0][0];
    expect(args.model).toBe("claude-sonnet-5-5");
    expect(args.max_tokens).toBe(1234);
    expect(args.system[0]).toMatchObject({ text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } });
    expect(args.system[1]).toEqual({ type: "text", text: "do it" });
    expect(args.messages).toEqual([{ role: "user", content: "<investigation/>" }]);
    expect(args.output_config.format).toEqual({ type: "json_schema", schema: { type: "object" } });
    expect(args.output_config.effort).toBe("medium");
    expect(args).not.toHaveProperty("temperature");
    expect(args).not.toHaveProperty("tool_choice");
    expect(ctorArgs[0]).toMatchObject({ apiKey: "test-key", timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });
  });

  it("uses ANTHROPIC_MODEL when set", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-opus-5-5");
    create.mockResolvedValue(reply("{}"));
    await callModel(CALL);
    expect(create.mock.calls[0][0].model).toBe("claude-opus-5-5");
  });

  it("refuses to run without a key and never calls the SDK", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(callModel(CALL)).rejects.toMatchObject({ code: "not_configured" });
    expect(create).not.toHaveBeenCalled();
  });

  it("maps refusals, truncation and bad JSON to 'unusable'", async () => {
    create.mockResolvedValueOnce(reply("{}", "refusal"));
    await expect(callModel(CALL)).rejects.toMatchObject({ code: "unusable" });
    create.mockResolvedValueOnce(reply('{"a":', "max_tokens"));
    await expect(callModel(CALL)).rejects.toMatchObject({ code: "unusable" });
    create.mockResolvedValueOnce(reply("not json"));
    await expect(callModel(CALL)).rejects.toMatchObject({ code: "unusable" });
  });

  it("maps SDK errors to friendly codes without carrying their message", async () => {
    const mk = (name: string, status?: number) => Object.assign(new Error("secret sk-ant-xyz detail"), { name, status });
    for (const [err, code] of [
      [mk("APIConnectionTimeoutError"), "timeout"],
      [mk("RateLimitError", 429), "busy"],
      [mk("InternalServerError", 529), "busy"],
      [mk("AuthenticationError", 401), "not_configured"],
      [mk("InternalServerError", 500), "unavailable"],
      [new TypeError("fetch failed"), "unavailable"],
    ] as const) {
      create.mockRejectedValueOnce(err);
      const e = (await callModel(CALL).catch((x) => x)) as AiError;
      expect(e).toBeInstanceOf(AiError);
      expect(e.code).toBe(code);
      expect(JSON.stringify(e)).not.toContain("sk-ant");
      expect(e.message).toBe(code);
    }
  });
});

describe("classifyError", () => {
  it("passes AiError through", () => {
    const e = new AiError("busy");
    expect(classifyError(e)).toBe(e);
  });
});
