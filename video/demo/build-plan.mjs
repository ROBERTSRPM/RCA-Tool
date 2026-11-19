// Builds remotion/plan.json from plan.src.json, the live-site clips and the edited voice (scene wavs).
// usage: node build-plan.mjs <clips dir> <audio dir>
// Times in plan.src.json are SCENE seconds (seconds into that scene's voice file). A "cue" pins a recorded beat
// (a mark from capture/scenes.mjs) to a voice moment: the beat's movement plays at normal speed, the hold after it is
// stretched or squeezed so the next beat lands on its cue.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const here = path.dirname(new URL(import.meta.url).pathname);
const [clipsDir, audioDir] = [process.argv[2] || process.env.CLIPS, process.argv[3] || process.env.AUDIO];
const src = JSON.parse(fs.readFileSync(path.join(here, "plan.src.json"), "utf8"));
const pubClips = path.join(here, "remotion/public/clips"), pubAudio = path.join(here, "remotion/public/audio");
fs.mkdirSync(pubClips, { recursive: true }); fs.mkdirSync(pubAudio, { recursive: true });
const dur = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let start = 0; const scenes = []; const warns = [];
for (const s of src.scenes) {
  const wav = path.join(audioDir, `${s.id}.wav`); fs.copyFileSync(wav, path.join(pubAudio, `${s.id}.wav`));
  const d = dur(wav); const o = { id: s.id, start: +start.toFixed(4), dur: +d.toFixed(4) };
  if (s.titleLen) o.titleLen = s.titleLen; if (s.endcardLen) o.endcardLen = s.endcardLen;
  const clipFile = `scene${s.id.slice(1)}.mp4`;
  fs.copyFileSync(path.join(clipsDir, clipFile), path.join(pubClips, clipFile));
  const clipLen = dur(path.join(clipsDir, clipFile));
  const marks = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(clipsDir, clipFile.replace(".mp4", ".marks.json")), "utf8")).marks.map((m) => [m.label, m.t]));
  o.clip = clipFile; o.segs = [];
  const end = d - (s.endcardLen ?? 0);
  const cues = s.cues.map((c) => ({ c: marks[c.mark], s: c.at, mv: c.move ?? 1.6, mark: c.mark }));
  cues.forEach((c) => { if (c.c === undefined) throw new Error(`${s.id}: no mark ${c.mark}`); });
  for (let i = 0; i < cues.length; i++) {
    const a = cues[i], nxtC = i + 1 < cues.length ? cues[i + 1].c : clipLen, nxtS = i + 1 < cues.length ? cues[i + 1].s : end;
    const sceneSpan = nxtS - a.s, clipSpan = nxtC - a.c;
    if (sceneSpan <= 0.05) { warns.push(`${s.id} cue ${a.mark}: no scene time`); continue; }
    const mv = Math.min(a.mv, sceneSpan, clipSpan);
    o.segs.push({ at: +a.s.toFixed(3), dur: +mv.toFixed(3), clipStart: +a.c.toFixed(3), rate: 1 });
    const holdScene = sceneSpan - mv, holdClip = clipSpan - mv;
    if (holdScene > 0.04 && holdClip > 0.04) {
      const nat = holdClip / holdScene, rate = clamp(nat, 0.5, 3);
      const play = Math.min(holdScene, holdClip / rate);
      o.segs.push({ at: +(a.s + mv).toFixed(3), dur: +play.toFixed(3), clipStart: +(a.c + mv).toFixed(3), rate: +rate.toFixed(3) });
      if (play < holdScene - 0.04) o.segs.push({ at: +(a.s + mv + play).toFixed(3), dur: +(holdScene - play).toFixed(3), clipStart: +(nxtC - 0.04).toFixed(3), rate: 1, freeze: true });
      if (nat < 0.5 || nat > 3) warns.push(`${s.id} ${a.mark}: hold rate ${nat.toFixed(2)} clamped`);
    }
  }
  o.captions = s.captions ?? []; o.highlights = s.highlights ?? []; o.zooms = s.zooms ?? [];
  scenes.push(o); start += d;
}
fs.writeFileSync(path.join(here, "remotion/plan.json"), JSON.stringify({ scenes }, null, 1));
console.log(scenes.map((s) => `${s.id} start=${s.start.toFixed(2)} dur=${s.dur.toFixed(2)} segs=${s.segs.length}`).join("\n"));
warns.forEach((w) => console.log("WARN", w));
console.log("total", start.toFixed(2));
