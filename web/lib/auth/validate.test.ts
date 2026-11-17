import { describe, expect, it } from "vitest";
import {
  friendlyAuthError,
  safeNext,
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
  validatePasswordMatch,
  PASSWORD_RULE_HINT,
} from "./validate";

describe("auth validation", () => {
  it("validates emails", () => {
    expect(validateEmail("")).toMatch(/Enter/);
    expect(validateEmail("nope")).toMatch(/email/);
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail(" qa@rca-tool.test ")).toBeNull();
  });
  it("validates passwords", () => {
    expect(validateLoginPassword("")).not.toBeNull();
    expect(validateLoginPassword("x")).toBeNull();
    expect(validateNewPassword("short")).toMatch(/8 characters/);
    expect(validateNewPassword("long-enough")).toBeNull();
    expect(validatePasswordMatch("a", "b")).not.toBeNull();
    expect(validatePasswordMatch("a", "a")).toBeNull();
  });
  it("maps supabase errors to plain language", () => {
    expect(friendlyAuthError({ message: "Invalid login credentials" }, "login")).toMatch(/do not match/);
    expect(friendlyAuthError({ code: "email_not_confirmed" }, "login")).toMatch(/not confirmed/);
    expect(friendlyAuthError({ status: 429 }, "forgot")).toMatch(/Too many/);
    expect(friendlyAuthError({ message: "Failed to fetch" }, "login")).toMatch(/connection/);
    expect(friendlyAuthError({ message: "boom" }, "login")).toMatch(/Something went wrong/);
    expect(friendlyAuthError(null, "login")).toMatch(/Something went wrong/);
  });
  it("rejects very common passwords and the email", () => {
    expect(validateNewPassword("password")).toMatch(/too common/);
    expect(validateNewPassword("Password123")).toMatch(/too common/);
    expect(validateNewPassword("12345678")).toMatch(/too common/);
    expect(validateNewPassword("QWERTYUIOP")).toMatch(/too common/);
    expect(validateNewPassword("short")).toMatch(/8 characters/);
    expect(validateNewPassword("qa-user-a@rca-tool.test", "QA-user-a@rca-tool.test")).toMatch(/email/);
    expect(validateNewPassword("qa-user-a@rca-tool.test", "other@x.test")).toBeNull();
    expect(validateNewPassword("tr0ub4dor&3x")).toBeNull();
    expect(PASSWORD_RULE_HINT).toMatch(/8 characters/);
  });
  it("allows same-site relative paths", () => {
    expect(safeNext("/app/investigations/1")).toBe("/app/investigations/1");
    expect(safeNext("/app/investigations/abc#cause")).toBe("/app/investigations/abc#cause");
    expect(safeNext("/app?x=1&y=2")).toBe("/app?x=1&y=2");
    expect(safeNext("/app", "/app", "https://rca-tool-omega.vercel.app")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
    expect(safeNext(undefined)).toBe("/app");
    expect(safeNext("")).toBe("/app");
    expect(safeNext("/x", "/home")).toBe("/x");
  });
  it("rejects every open-redirect payload from the audit", () => {
    const payloads = [
      "//evil.example.com",
      "/\\evil.example.com",
      "/\tevil.example.com",
      "https://evil.example.com",
      "http://evil.example.com/x",
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "/\t/evil.example.com", // literal tab
      "/\n/evil.example.com", // literal newline
      "/\r/evil.example.com",
      "/\u0000/evil.example.com",
      "/\u001f/evil.example.com",
      "/\u007f/evil.example.com",
      "/%09/evil.example.com", // encoded tab
      "/%0a/evil.example.com",
      "/%0A/evil.example.com",
      "/%0d/evil.example.com",
      "/%2F/evil.example.com", // encoded second slash
      "/%2f%2fevil.example.com",
      "%2F%2Fevil.example.com",
      "/%5Cevil.example.com", // encoded backslash
      "/%5cevil.example.com",
      "%2F%09%2Fevil.example.com",
      "///evil.example.com",
      "/%",
      " //evil.example.com",
      "evil.example.com",
      "app",
      "\\evil.example.com",
    ];
    for (const p of payloads) {
      expect(safeNext(p), JSON.stringify(p)).toBe("/app");
      expect(safeNext(p, "/app", "https://rca-tool-omega.vercel.app"), JSON.stringify(p)).toBe("/app");
    }
  });
  it("rejects dot segments that normalise to a protocol-relative path (R3-07)", () => {
    for (const v of [
      "/app/..//evil.example",
      "/app/../..//evil.example",
      "/app/%2e%2e//evil.example",
      "/..//evil.example",
      "/app/./..//evil.example/path",
      "/a/b/../../..//evil.example",
    ]) {
      expect(safeNext(v), v).toBe("/app");
      expect(safeNext(v, "/app", "https://rca-tool-omega.vercel.app"), v).toBe("/app");
    }
  });
  it("still accepts harmless dot segments", () => {
    expect(safeNext("/app/../app/assets")).toBe("/app/assets");
  });
  it("uses the given fallback", () => {
    expect(safeNext("//evil.example.com", "/login")).toBe("/login");
  });
});
