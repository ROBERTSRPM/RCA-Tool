import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("AI data notice and privacy text (AI-08)", () => {
  it("every AI panel shows the notice with a privacy link", () => {
    const s = read("components/workspace/ai/shared.tsx");
    expect(s).toContain('data-testid="ai-notice"');
    expect(s).toContain("to our AI provider, Anthropic");
    expect(s).toContain("commercial terms do not allow training models");
    expect(s).toContain('href="/privacy"');
  });
  it("the privacy page is marked draft, covers AI features and is linked from the footer", () => {
    const p = read("app/privacy/page.tsx");
    expect(p).toMatch(/Draft\./);
    expect(p).toContain("AI features");
    expect(p).toContain("Anthropic");
    expect(read("app/page.tsx")).toContain('href="/privacy"');
  });
});
