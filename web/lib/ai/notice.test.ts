import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("AI data notice and privacy text (AI-08)", () => {
  it("is shown once by AiNoticeHost, not repeated in every AI panel", () => {
    expect(read("components/workspace/ai/shared.tsx")).not.toContain("to our AI provider");
    const h = read("components/workspace/ai/AiNoticeHost.tsx");
    expect(h).toContain('data-testid="ai-notice"');
    expect(h).toContain("Anthropic");
    expect(h).toContain('href="/privacy"');
    expect(read("components/auth/AppShell.tsx")).toContain("<AiNoticeHost />");
  });
  it("the privacy page is marked draft, says where data goes, and is linked from the footer", () => {
    const p = read("app/privacy/page.tsx");
    expect(p).toMatch(/Draft\./);
    expect(p).toContain("Sydney");
    expect(p).toContain("United States");
    expect(p).toContain("No data is sent to China");
    expect(p).toContain("stay in Australia");
    expect(read("components/site/SiteFooter.tsx")).toContain('href="/privacy"');
  });
  it("help covers the AI data notice and terms is a marked draft", () => {
    expect(read("app/help/page.tsx")).toContain("AI data notice");
    expect(read("app/terms/page.tsx")).toContain("Draft — under review");
    expect(read("app/terms/page.tsx")).toContain("Australia");
  });
  it("support email is used on footer, error pages and auth pages", () => {
    expect(read("lib/brand.ts")).toContain("roberts@intelbeyond.com");
    for (const f of ["components/site/SiteFooter.tsx", "app/not-found.tsx", "app/error.tsx", "components/auth/AccountMenu.tsx"]) {
      expect(read(f)).toContain("SUPPORT_EMAIL");
    }
    expect(read("components/auth/AuthFrame.tsx")).toContain("NeedHelp");
    expect(read("components/site/SiteFooter.tsx")).toContain("Need help?");
  });
  it("signup has no Free claim", () => {
    expect(read("components/auth/SignupForm.tsx")).not.toMatch(/Free[.\s]/);
    expect(read("components/auth/LoginForm.tsx")).not.toMatch(/free account/i);
  });
});
