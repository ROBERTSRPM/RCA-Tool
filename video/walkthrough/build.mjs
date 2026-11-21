// Assembles the screen scenes: retimes each captured clip to the voice (cues pin capture marks to spoken phrases),
// overlays key-term captions, and encodes one video file per scene. Usage: node build.mjs <clips dir> <audio dir> <work dir> [scene ids...]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");
const here = path.dirname(new URL(import.meta.url).pathname);
const [clipsDir, audioDir, work] = process.argv.slice(2, 5);
const only = process.argv.slice(5);
const plan = JSON.parse(fs.readFileSync(path.join(here, "plan.src.json"), "utf8"));
const words = JSON.parse(fs.readFileSync(path.join(audioDir, "words.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(audioDir, "report.json"), "utf8"));
fs.mkdirSync(path.join(work, "caps"), { recursive: true }); fs.mkdirSync(path.join(work, "vid"), { recursive: true });
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const dur = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// time (scene seconds) of the first spoken occurrence of a phrase; "after" lets a phrase be found later in the scene
function at(sceneNo, phrase, after = 0) {
  const ws = words[String(sceneNo)], p = phrase.split(/\s+/).map(norm).filter(Boolean);
  for (let i = 0; i < ws.length - p.length + 1; i++) {
    if (ws[i][1] < after) continue;
    if (p.every((x, k) => norm(ws[i + k][0]).startsWith(x) || x.startsWith(norm(ws[i + k][0])) && norm(ws[i + k][0]).length > 2)) return ws[i][1];
  }
  throw new Error(`scene ${sceneNo}: phrase not found: ${phrase}`);
}
const T = (n, v, after) => (typeof v === "number" ? v : /^end-/.test(v) ? report[n].seconds - parseFloat(v.slice(4)) : at(n, v, after));

// caption PNGs (transparent, full frame, bottom-left lower third, key terms only)
async function captions(list) {
  const font = fs.readFileSync(path.join(here, "remotion/public/fonts/inter-latin-wght-normal.woff2")).toString("base64");
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  for (const text of list) {
    const f = path.join(work, "caps", Buffer.from(text).toString("hex").slice(0, 40) + ".png");
    if (fs.existsSync(f)) continue;
    await page.setContent(`<style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}body{margin:0;background:transparent;width:1920px;height:1080px;position:relative;font-family:Inter}
      .c{position:absolute;left:72px;bottom:64px;display:flex;background:rgba(255,255,255,.97);border:1px solid #e2e5ea;border-radius:8px;box-shadow:0 6px 24px rgba(22,26,33,.22);overflow:hidden}
      .b{width:8px;background:#c2410c}.t{padding:16px 28px;font-size:34px;font-weight:600;color:#161a21;letter-spacing:-.3px}</style><div class="c"><div class="b"></div><div class="t">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></div>`);
    await page.screenshot({ path: f, omitBackground: true });
  }
  await browser.close();
}
const capFile = (text) => path.join(work, "caps", Buffer.from(text).toString("hex").slice(0, 40) + ".png");

function buildScene(s) {
  const n = +s.id.slice(1), D = report[n].seconds, clip = path.join(clipsDir, `scene${n}.mp4`);
  const clipLen = dur(clip);
  const marks = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(clipsDir, `scene${n}.marks.json`), "utf8")).marks.map((m) => [m.label, m.t]));
  const end = D - (s.endcardLen ?? 0);
  const cues = s.cues.map((c) => ({ c: marks[c.mark], s: c.at === undefined ? (c.phrase ? T(n, c.phrase, c.after) + (c.shift ?? 0) : 0) : c.at, mv: c.move ?? 1.6, mark: c.mark }));
  cues.forEach((c) => { if (c.c === undefined) throw new Error(`${s.id}: no mark ${c.mark}`); });
  cues[0].s = 0;
  for (let i = 1; i < cues.length; i++) if (cues[i].s < cues[i - 1].s + 0.3) cues[i].s = cues[i - 1].s + 0.3;
  const segs = [];
  for (let i = 0; i < cues.length; i++) {
    const a = cues[i], nxtC = i + 1 < cues.length ? cues[i + 1].c : clipLen, nxtS = i + 1 < cues.length ? cues[i + 1].s : end;
    const sceneSpan = nxtS - a.s, clipSpan = nxtC - a.c; if (sceneSpan <= 0.05) continue;
    if (clipSpan <= 0.05) { segs.push({ at: a.s, dur: sceneSpan, cs: Math.max(0, a.c), rate: 1, freeze: true }); continue; }
    const mv = Math.min(a.mv, sceneSpan, clipSpan);
    segs.push({ at: a.s, dur: mv, cs: a.c, rate: 1 });
    const hs = sceneSpan - mv, hc = clipSpan - mv;
    if (hs > 0.04 && hc > 0.04) {
      const nat = hc / hs, rate = clamp(nat, 0.5, 4), play = Math.min(hs, hc / rate);
      segs.push({ at: a.s + mv, dur: play, cs: a.c + mv, rate });
      if (play < hs - 0.04) segs.push({ at: a.s + mv + play, dur: hs - play, cs: Math.max(0, nxtC - 0.05), rate: 1, freeze: true });
    } else if (hs > 0.04) segs.push({ at: a.s + mv, dur: hs, cs: Math.max(0, nxtC - 0.05), rate: 1, freeze: true });
  }
  // filtergraph
  const parts = []; const labels = [];
  segs.forEach((g, i) => {
    const L = `v${i}`;
    if (g.freeze) parts.push(`[0:v]trim=start=${g.cs.toFixed(3)}:end=${(g.cs + 0.1).toFixed(3)},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${g.dur.toFixed(3)},trim=duration=${g.dur.toFixed(3)},setpts=PTS-STARTPTS[${L}]`);
    else parts.push(`[0:v]trim=start=${g.cs.toFixed(3)}:end=${(g.cs + g.dur * g.rate).toFixed(3)},setpts=(PTS-STARTPTS)/${g.rate.toFixed(4)},fps=30[${L}]`);
    labels.push(`[${L}]`);
  });
  parts.push(`${labels.join("")}concat=n=${labels.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=2,trim=duration=${D.toFixed(3)},setpts=PTS-STARTPTS[base]`);
  // highlights: a subtle orange box and glow round a spoken number or item. The rectangle was measured during capture (rects.json) while the
  // page was still, so the highlight is limited to the hold of the cue it belongs to.
  const rectsFile = path.join(clipsDir, `scene${n}.rects.json`); const rects = fs.existsSync(rectsFile) ? JSON.parse(fs.readFileSync(rectsFile, "utf8")) : {};
  const hl = [];
  for (let h of s.highlights ?? []) {
    const nm = h.item ?? h.rect; const r = rects[nm]; if (!r) { console.log(`WARN ${s.id}: no rect ${nm}`); continue; }
    let a, b;
    if (h.item) {  // an item beat: the box is on from the moment the cursor has arrived until the next beat starts (capped), on exactly that item
      const ci = cues.findIndex((c) => c.mark === h.item); if (ci < 0) { console.log(`WARN ${s.id}: no cue for item ${h.item}`); continue; }
      a = cues[ci].s + Math.min(cues[ci].mv, 1.0) * 0.85; b = Math.min(a + (h.dur ?? 4.8), (ci + 1 < cues.length ? cues[ci + 1].s : D) - 0.1);
    } else { a = T(n, h.phrase ?? h.at, h.after) + (h.shift ?? 0); b = a + (h.dur ?? 3); }
    h = { ...h, rect: nm };
    if (h.cue) { const ci = cues.findIndex((c) => c.mark === h.cue); if (ci >= 0) { const lo = cues[ci].s + Math.min(cues[ci].mv, 99) * 0.6, hi = ci + 1 < cues.length ? cues[ci + 1].s : D; a = Math.max(a, lo); b = Math.min(b, hi - 0.2); } }
    if (b - a < 0.4) { console.log(`WARN ${s.id}: highlight ${h.rect} has no room (${a.toFixed(1)}-${b.toFixed(1)})`); continue; }
    hl.push({ ...r, a, b, name: h.rect });
  }
  if (hl.length) {
    const dbs = hl.flatMap((h) => [`drawbox=x=${h.x}:y=${h.y}:w=${h.w}:h=${h.h}:color=0xea580c@0.10:t=fill:enable='between(t,${h.a.toFixed(2)},${h.b.toFixed(2)})'`, `drawbox=x=${h.x}:y=${h.y}:w=${h.w}:h=${h.h}:color=0xea580c@0.95:t=5:enable='between(t,${h.a.toFixed(2)},${h.b.toFixed(2)})'`]);
    parts.push(`[base]${dbs.join(",")}[hb]`);
  }
  const inputs = ["-i", clip]; let cur = hl.length ? "hb" : "base"; let k = 1;
  const caps = (s.captions ?? []).map((c) => ({ ...c, a: T(n, c.phrase ?? c.at, c.after) + (c.shift ?? 0) }));
  for (const c of caps) {
    const a = c.a, b = Math.min(a + (c.dur ?? 4), D - 0.1);
    inputs.push("-loop", "1", "-t", String(D), "-i", capFile(c.text));
    parts.push(`[${k}:v]format=rgba,fade=t=in:st=${a.toFixed(2)}:d=0.3:alpha=1,fade=t=out:st=${(b - 0.3).toFixed(2)}:d=0.3:alpha=1[c${k}]`);
    parts.push(`[${cur}][c${k}]overlay=0:0:format=auto:shortest=0[o${k}]`); cur = `o${k}`; k++;
  }
  if (s.endcardPhrase) {
    const a = T(n, s.endcardPhrase) + (s.endcardShift ?? 0);
    inputs.push("-loop", "1", "-t", String(D), "-i", path.join(work, "endcard.png"));
    parts.push(`[${k}:v]format=rgba,fade=t=in:st=${a.toFixed(2)}:d=0.8:alpha=1[ec]`);
    parts.push(`[${cur}][ec]overlay=0:0:format=auto[oe]`); cur = "oe";
  }
  const out = path.join(work, "vid", `${s.id}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", parts.join(";"), "-map", `[${cur}]`, "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", "30", "-t", D.toFixed(3), out], { maxBuffer: 1 << 28 });
  console.log(s.id, "scene", D.toFixed(2), "s,", segs.length, "segments,", caps.length, "captions ->", out);
  return { id: s.id, cues: s.cues.map((c, i) => ({ mark: c.mark, phrase: c.phrase ?? null, at: +cues[i].s.toFixed(2) })), highlightsFull: hl.map((h) => ({ name: h.name, a: +h.a.toFixed(2), b: +h.b.toFixed(2), rect: { x: h.x, y: h.y, w: h.w, h: h.h } })), highlights: hl.map((h) => [h.name, +h.a.toFixed(2), +h.b.toFixed(2)]), segs, caps: caps.map((c) => [c.text, +c.a.toFixed(2)]) };
}
const todo = plan.scenes.filter((s) => !only.length || only.includes(s.id));
await captions(todo.flatMap((s) => (s.captions ?? []).map((c) => c.text)));
const info = todo.map(buildScene);
const biFile = path.join(work, "build-info.json"); let prev = []; try { prev = JSON.parse(fs.readFileSync(biFile, "utf8")); } catch {}
const merged = [...prev.filter((p) => !info.some((i) => i.id === p.id)), ...info].sort((x, y) => +x.id.slice(1) - +y.id.slice(1));
fs.writeFileSync(biFile, JSON.stringify(merged, null, 1));
