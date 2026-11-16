import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BRAND_NAME } from "./brand";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("brand", () => {
  it("is defined in one place only", () => {
    const root = path.resolve(__dirname, "..");
    const offenders = ["app", "components", "lib"]
      .flatMap((d) => walk(path.join(root, d)))
      .filter((f) => !f.endsWith("brand.ts") && !f.endsWith("brand.test.ts"))
      .filter((f) => fs.readFileSync(f, "utf8").includes(BRAND_NAME));
    expect(offenders).toEqual([]);
  });
});
