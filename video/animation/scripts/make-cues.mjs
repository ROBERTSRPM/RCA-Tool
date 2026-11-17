// Builds src/cues.json (read by the scenes) from public/audio/timing/*.json (word timings) and cue-spec.json (beat -> spoken phrase).
// Usage: node scripts/make-cues.mjs        (also prints the beat table and fails if any beat is more than MAXLEAD s before its phrase)
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAXLEAD = 0.3;
const spec = JSON.parse(fs.readFileSync(path.join(root, "cue-spec.json"), "utf8"));
const scenes = JSON.parse(fs.readFileSync(path.join(root, "scenes.json"), "utf8")).scenes;
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const eq = (a, b) => a === b || (a.length >= 6 && b.length >= 6 && lev(a, b) <= 1);
function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const out = {};
const rows = [];
let bad = 0;
for (const sc of scenes) {
  const id = sc.id;
  const t = JSON.parse(fs.readFileSync(path.join(root, "public/audio/timing", id + ".json"), "utf8"));
  const W = t.words.map((w) => ({...w, n: norm(w.w)})).filter((w) => w.n.length);
  const list = spec[id];
  if (!list) throw new Error("no cue spec for " + id);
  out[id] = {};
  let from = 0;
  for (const c of list) {
    const toks = c.say.split(/\s+/).map(norm).filter(Boolean);
    let found = -1;
    for (let i = from; i + toks.length <= W.length; i++) {
      if (toks.every((tk, k) => tk === "*" || eq(W[i + k].n, tk))) { found = i; break; }
    }
    if (found < 0) throw new Error(`${id}/${c.key}: phrase "${c.say}" not found after word ${from} (${W[from]?.w})`);
    const first = W[found], last = W[found + toks.length - 1];
    const tok = c.token ?? 0; // optional: use the start of the k-th word of the phrase instead of the first (e.g. a number inside it)
    const phraseStart = W[found + tok].s;
    const lead = c.lead ?? 0.1;
    const beat = Math.max(0, +(phraseStart - lead).toFixed(3));
    out[id][c.key] = {say: c.say, phraseStart: +phraseStart.toFixed(3), phraseEnd: +last.e.toFixed(3), beat, note: c.note};
    if (c.advance !== false) from = found + 1;
    if (c.role !== "end") rows.push({id, key: c.key, say: c.say, phraseStart, beat, d: beat - phraseStart});
    if (c.role !== "end" && beat - phraseStart < -MAXLEAD - 1e-6) bad++;
  }
}
fs.writeFileSync(path.join(root, "src/cues.json"), JSON.stringify(out, null, 1));
console.log("cues written:", rows.length, "beats;", bad, "too early");
if (process.argv.includes("--table")) for (const r of rows) console.log(`${r.id}\t${r.key.padEnd(14)}\t${r.phraseStart.toFixed(2).padStart(6)}\t${r.beat.toFixed(2).padStart(6)}\t${r.d.toFixed(2).padStart(6)}\t${r.say}`);
if (bad) process.exit(1);
