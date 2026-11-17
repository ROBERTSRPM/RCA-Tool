// Usage: node scripts/cue-stills.mjs <outDir> [sceneIds comma list|all]
// Renders, for every scene, a still just after each of several beats starts and one just before the next beat, from src/cues.json.
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [outDir, which = "all"] = process.argv.slice(2);
const cues = JSON.parse(fs.readFileSync(path.join(root, "src/cues.json"), "utf8"));
const cfg = JSON.parse(fs.readFileSync(path.join(root, "scenes.json"), "utf8"));
const exe = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"].find((p) => fs.existsSync(p));
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, "src/index.ts")});
const ids = which === "all" ? cfg.scenes.map((s) => s.id) : which.split(",");
const manifest = [];
for (const id of ids) {
  const comp = await selectComposition({serveUrl, id, browserExecutable: exe});
  const rows = Object.entries(cues[id]).sort((a, b) => a[1].beat - b[1].beat);
  const times = [];
  const step = Math.max(1, Math.floor(rows.length / 6));
  for (let i = 0; i < rows.length; i += step) {
    const [k, row] = rows[i];
    times.push({label: `after ${k}`, t: row.beat + 0.9, say: row.say});
    const nxt = rows[i + 1];
    if (nxt) times.push({label: `before ${nxt[0]}`, t: nxt[1].beat - 0.1, say: nxt[1].say});
  }
  times.push({label: "end", t: cfg.scenes.find((s) => s.id === id).duration - 0.8, say: ""});
  for (const {label, t, say} of times) {
    const frame = Math.max(0, Math.min(comp.durationInFrames - 1, Math.round(t * 30)));
    const out = path.join(outDir, `${id}_${String(frame).padStart(5, "0")}.png`);
    await renderStill({composition: comp, serveUrl, output: out, frame, browserExecutable: exe, imageFormat: "png"});
    manifest.push({id, frame, t: +(frame / 30).toFixed(2), label, say, file: out});
    console.log(id, label, (frame / 30).toFixed(2));
  }
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
