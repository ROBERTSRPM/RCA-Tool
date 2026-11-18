import { describe, expect, it } from "vitest";
import { buildSample } from "../sample";
import { buildAiContext } from "./context";
import { defaultDeps } from "./handler";
import { isMockEnabled, mockModel } from "./mock";
import { parseRequest } from "./requests";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("mock mode can never run in production", () => {
  it("is off unless AI_MOCK is set", () => {
    expect(isMockEnabled(env({ NODE_ENV: "development" }))).toBe(false);
    expect(isMockEnabled(env({ NODE_ENV: "development", AI_MOCK: "0" }))).toBe(false);
  });
  it("is on in development and test with the flag", () => {
    expect(isMockEnabled(env({ NODE_ENV: "development", AI_MOCK: "1" }))).toBe(true);
    expect(isMockEnabled(env({ NODE_ENV: "test", AI_MOCK: "fail" }))).toBe(true);
  });
  it("is off in production whatever the flag says", () => {
    expect(isMockEnabled(env({ NODE_ENV: "production", AI_MOCK: "1" }))).toBe(false);
    expect(isMockEnabled(env({ NODE_ENV: "production", AI_MOCK: "fail" }))).toBe(false);
  });
  it("mockModel refuses to answer in production", async () => {
    const r = parseRequest("coach", { context: buildAiContext(buildSample()), scope: "tree" });
    if (!r.ok) throw new Error("setup");
    await expect(mockModel(r.value, env({ NODE_ENV: "production", AI_MOCK: "1" }))).rejects.toMatchObject({ code: "unavailable" });
  });
  it("the default handler does not count the mock as a configured key in production", () => {
    const keep = { ...process.env };
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      process.env.AI_MOCK = "1";
      delete process.env.ANTHROPIC_API_KEY;
      expect(defaultDeps.hasKey()).toBe(false);
    } finally {
      process.env = keep;
    }
  });
});
