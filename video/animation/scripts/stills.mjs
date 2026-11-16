// Usage: node scripts/stills.mjs <outDir> <sceneId|all> [fractions comma list, default 0.5,0.97]
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [outDir, which = "all", fr = "0.5,0.97"] = process.argv.slice(2);
const fracs = fr.split(",").map(Number);
const cfg = JSON.parse(fs.readFileSync(path.join(root, "scenes.json"), "utf8"));
const exe = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"].find((p) => fs.existsSync(p));
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, "src/index.ts")});
const ids = which === "all" ? cfg.scenes.map((s) => s.id) : which.split(",");
for (const id of ids) {
  const comp = await selectComposition({serveUrl, id, browserExecutable: exe});
  for (const f of fracs) {
    const frame = Math.min(comp.durationInFrames - 1, Math.round(f * comp.durationInFrames));
    const output = path.join(outDir, `${id}_${String(Math.round(f * 100)).padStart(3, "0")}.png`);
    await renderStill({composition: comp, serveUrl, output, frame, browserExecutable: exe});
    console.log(output);
  }
}
