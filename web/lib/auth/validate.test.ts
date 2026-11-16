import { describe, expect, it } from "vitest";
import {
  friendlyAuthError,
  safeNext,
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
  validatePasswordMatch,
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
  it("only allows same-site redirect paths", () => {
    expect(safeNext("/app/investigations/1")).toBe("/app/investigations/1");
    expect(safeNext("https://evil.test")).toBe("/app");
    expect(safeNext("//evil.test")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
    expect(safeNext("/\\evil")).toBe("/app");
  });
});
