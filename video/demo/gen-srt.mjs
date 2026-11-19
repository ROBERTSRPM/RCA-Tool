// Captions (.srt) from the script text and the actual spoken timings (word times from a Whisper pass over the edited scene wavs).
// usage: node gen-srt.mjs <audio dir with words.json + report>   (scene durations come from remotion/plan.json)
import fs from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const audioDir = process.argv[2] || process.env.AUDIO;
const md = fs.readFileSync(here + "script.md", "utf8");
const scenes = [...md.matchAll(/## Scene (\d+): [^(]*\((\d+) s\)\s+\*\*Say:\*\* "(.*?)"/gs)].map((m) => ({ n: +m[1], text: m[3] }));
const words = JSON.parse(fs.readFileSync(audioDir + "/words.json", "utf8"));
const plan = JSON.parse(fs.readFileSync(here + "remotion/plan.json", "utf8"));
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIAS = { add: ["add", "at", "ad"], after: ["after"], now: ["now"] };
const same = (a, b) => (ALIAS[a] ?? [a]).includes(b);
const ts = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), mi = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
let out = "", idx = 1;
for (const s of scenes) {
  const p = plan.scenes[s.n - 1], w = words[String(s.n)];
  const sentences = s.text.match(/[^.!?]+[.!?]+/g).map((x) => x.trim());
  // first spoken word of each sentence, matched in order
  let pos = 0; const starts = [];
  for (const [i, sen] of sentences.entries()) {
    const first = norm(sen.split(/\s+/)[0]);
    const second = norm(sen.split(/\s+/)[1] ?? "");
    let j = pos; while (j < w.length && !(same(first, norm(w[j][0])) && same(second, norm((w[j + 1] ?? ["", 0])[0])))) j++;
    if (j >= w.length) { j = pos; while (j < w.length && !same(first, norm(w[j][0]))) j++; }
    if (j >= w.length) j = Math.min(pos, w.length - 1);
    starts.push(j); pos = j + 1;
  }
  sentences.forEach((sen, i) => {
    const a = w[starts[i]][1], endIdx = (i + 1 < starts.length ? starts[i + 1] : w.length) - 1;
    let b = w[Math.max(endIdx, starts[i])][2];
    if (i + 1 < starts.length) b = Math.min(b + 0.35, w[starts[i + 1]][1] - 0.04); else b += 0.4;
    out += `${idx++}\n${ts(p.start + a)} --> ${ts(p.start + Math.max(b, a + 0.6))}\n${sen.replace(/w w w dot r c a pilot dot com/, "www.rcapilot.com")}\n\n`;
  });
}
fs.mkdirSync(here + "out", { recursive: true });
fs.writeFileSync(here + "out/demo-captions.srt", out); fs.writeFileSync(here + "captions.srt", out);
console.log(`${idx - 1} cues`);
