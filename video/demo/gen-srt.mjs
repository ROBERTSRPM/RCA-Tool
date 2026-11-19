// Captions (.srt) from script.md: sentences timed by word count inside each scene's target duration.
import fs from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const md = fs.readFileSync(here + "script.md", "utf8");
const scenes = [...md.matchAll(/## Scene (\d+): [^(]*\((\d+) s\)\s+\*\*Say:\*\* "(.*?)"/gs)].map((m) => ({ n: +m[1], dur: +m[2], text: m[3] }));
const ts = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), mi = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
let t0 = 0, idx = 1, out = "";
for (const s of scenes) {
  const sentences = s.text.match(/[^.!?]+[.!?]+/g).map((x) => x.trim());
  const words = sentences.map((x) => x.split(/\s+/).length), total = words.reduce((a, b) => a + b, 0);
  const a = t0 + 0.3, span = s.dur - 1.3; let cur = a;
  sentences.forEach((x, i) => { const d = (words[i] / total) * span; out += `${idx++}\n${ts(cur)} --> ${ts(cur + d - 0.05)}\n${x.replace(/w w w dot r c a pilot dot com/, "www.rcapilot.com")}\n\n`; cur += d; });
  t0 += s.dur;
}
fs.mkdirSync(here + "out", { recursive: true });
fs.writeFileSync(here + "out/demo-captions.srt", out); fs.writeFileSync(here + "captions.srt", out);
console.log(`${scenes.length} scenes, ${t0}s, ${idx - 1} cues`);
