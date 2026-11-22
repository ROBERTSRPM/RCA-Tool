// Captions (.srt) from the owner's read text and the actual spoken timings (Whisper word times on the edited scene files).
// Where the owner's words differ from the text, OVERRIDES holds what was actually said. usage: node gen-srt.mjs <audio dir>
import fs from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const audioDir = process.argv[2];
const words = JSON.parse(fs.readFileSync(audioDir + "/words.json", "utf8"));
const rep = JSON.parse(fs.readFileSync(audioDir + "/report.json", "utf8"));
const txt = fs.readFileSync(here + "voiceover-for-walkthrough.txt", "utf8");
const OVERRIDES = [
  [3, "So where do you start?", "So where do we start?"], [3, "an email and a password", "an email and password"],
  [10, "link the film specification", "link the film inspection"],
];
// when the owner's two re-recorded scene-10 lines are in recordings/, the captions follow the new wording
const has = (tag) => fs.readdirSync(here + "recordings").some((f) => f.startsWith(`scene10-line-${tag}.`));
if (has("a")) OVERRIDES.push([10, "It also suggests the gas mix, but the oxygen readings were in spec, so I dismiss it.", "It also suggests the seal plate is marked and not flat. The inspection found those marks. So that one goes in too."]);
const hasF = (name) => fs.readdirSync(here + "recordings").some((f) => f.startsWith(name + "."));
if (hasF("scene11-line-preventive")) OVERRIDES.push([11, "Preventive actions stop it coming back.", "Preventive actions stop it from coming back."]);
if (has("b")) { for (let i = OVERRIDES.length - 1; i >= 0; i--) if (OVERRIDES[i][2] === "link the film inspection") OVERRIDES.splice(i, 1); }
const scenes = {}; for (const m of txt.matchAll(/Scene (\d+): [^\n]*\n(.*?)(?=\nScene \d+:|$)/gs)) scenes[m[1]] = m[2].replace(/\s+/g, " ").trim().replace(/w w w dot r c a pilot dot com/g, "www.rcapilot.com");
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIAS = { jots: ["jots", "dots", "jot"], scrapped: ["scrapped", "scrap"], 4: ["4", "four"], two: ["two", "2"], i: ["i", "ive", "ill"] };
const same = (a, b) => a === b || (ALIAS[a] ?? []).includes(b) || b.startsWith(a) && a.length > 3 || a.startsWith(b) && b.length > 3;
const ts = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), mi = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
let out = "", idx = 1, start = 0;
for (let n = 1; n <= 15; n++) {
  let text = scenes[n]; for (const [sc, a, b] of OVERRIDES) if (sc === n) text = text.replace(a, b);
  const w = words[String(n)];
  const sentences = (text.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [text]).map((x) => x.trim());
  // split long sentences at the comma nearest the middle
  const units = [];
  for (const s of sentences) {
    if (s.length > 96 && s.includes(",")) {
      const mid = s.length / 2; let best = -1, bd = 1e9; [...s.matchAll(/,/g)].forEach((m) => { const d = Math.abs(m.index - mid); if (d < bd) { bd = d; best = m.index; } });
      units.push(s.slice(0, best + 1).trim(), s.slice(best + 1).trim());
    } else units.push(s);
  }
  let pos = 0; const starts = [];
  for (const u of units) {
    const toks = u.split(/\s+/).map(norm).filter(Boolean); const f = toks[0], f2 = toks[1] ?? "";
    let j = pos; while (j < w.length && !(same(f, norm(w[j][0])) && same(f2, norm((w[j + 1] ?? ["", 0])[0])))) j++;
    if (j >= w.length) { j = pos; while (j < w.length && !same(f, norm(w[j][0]))) j++; }
    if (j >= w.length) j = Math.min(pos, w.length - 1);
    starts.push(j); pos = j + 1;
  }
  units.forEach((u, i) => {
    const a = w[starts[i]][1], endIdx = (i + 1 < starts.length ? starts[i + 1] : w.length) - 1;
    let b = w[Math.max(endIdx, starts[i])][2];
    b = i + 1 < starts.length ? Math.min(b + 0.4, w[starts[i + 1]][1] - 0.05) : b + 0.5;
    out += `${idx++}\n${ts(start + a)} --> ${ts(start + Math.max(b, a + 0.7))}\n${u}\n\n`;
  });
  start += rep[n].seconds;
}
// no cue may run into the next one: trim an end that overlaps the following start (a cue shorter than 0.7 s is stretched above)
{
  const toS = (h, m, sec, ms) => +h * 3600 + +m * 60 + +sec + +ms / 1000;
  const cues = [...out.matchAll(/(\d+)\n(\d\d):(\d\d):(\d\d),(\d+) --> (\d\d):(\d\d):(\d\d),(\d+)\n(.*?)\n\n/gs)].map((m) => ({ i: m[1], a: toS(m[2], m[3], m[4], m[5]), b: toS(m[6], m[7], m[8], m[9]), t: m[10] }));
  for (let k = 0; k + 1 < cues.length; k++) if (cues[k].b > cues[k + 1].a - 0.04) cues[k].b = Math.max(cues[k].a + 0.1, Math.min(cues[k].b, cues[k + 1].a - 0.01));
  out = cues.map((c) => `${c.i}\n${ts(c.a)} --> ${ts(c.b)}\n${c.t}\n\n`).join("");
}
fs.writeFileSync(here + "captions.srt", out);
console.log(idx - 1, "cues");
