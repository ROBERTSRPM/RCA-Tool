// Builds remotion/plan.json from plan.src.json + clips (copied into remotion/public/clips, git-ignored).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const here = path.dirname(new URL(import.meta.url).pathname);
const clipsDir = process.argv[2] || process.env.CLIPS;
const src = JSON.parse(fs.readFileSync(path.join(here, "plan.src.json"), "utf8"));
fs.mkdirSync(path.join(here, "remotion/public/clips"), { recursive: true });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const scenes = src.scenes.map((s) => {
  const out = { id: s.id, target: s.target };
  if (s.title) out.title = true;
  if (s.endcard) out.endcard = true;
  out.offset = s.offset ?? 0;
  if (!s.clip) return out;
  fs.copyFileSync(path.join(clipsDir, s.clip), path.join(here, "remotion/public/clips", s.clip));
  const clipLen = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(clipsDir, s.clip)]).toString();
  const marks = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(clipsDir, s.clip.replace(".mp4", ".marks.json")), "utf8")).marks.map((m) => [m.label, m.t]));
  const len = s.target - (s.offset ?? 0) - (s.endcard ? 5.5 : 0);
  const from = s.from ?? 0;
  const rate = clamp((clipLen - from) / len, 0.8, 1.6);
  const T = (t) => { // clip time -> scene (clip sequence) time
    if (typeof t === "string") { const [k, d] = t.replace("mark:", "").split(/-(?=\d+$)/); t = (marks[k] ?? 0) + (d ? +d : 0); }
    return +((t - from) / rate).toFixed(2);
  };
  Object.assign(out, { clip: s.clip, clipLen: +clipLen.toFixed(2), from, len: +len.toFixed(2), rate: +rate.toFixed(3) });
  out.captions = (s.captions ?? []).map((c) => ({ text: c.text, at: T(c.at), dur: +(c.dur / rate).toFixed(2) })).filter((c) => c.at >= 0 && c.at + c.dur <= len + 0.01 || (c.at < len && (c.dur = +(len - c.at).toFixed(2), true)));
  out.highlights = (s.highlights ?? []).map((h) => ({ ...h, at: T(h.at), dur: +(h.dur / rate).toFixed(2) }));
  out.zooms = (s.zooms ?? []).map((z) => ({ ...z, at: T(z.at), dur: +(z.dur / rate).toFixed(2) }));
  return out;
});
fs.writeFileSync(path.join(here, "remotion/plan.json"), JSON.stringify({ scenes }, null, 1));
console.log(scenes.map((s) => `${s.id} target=${s.target} rate=${s.rate ?? "-"}`).join("\n"));
