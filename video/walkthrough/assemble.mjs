// Joins the scene videos to the voice/sfx stems and writes the final mp4.
// usage: node assemble.mjs <audio dir (s1..s15.wav, report.json)> <work dir (vid/sN.mp4, story1.mp4, story2.mp4)> <out dir>
// Stems written to <out dir>/stems: voice.wav (edited voice), sfx.wav and music.wav (both generated, ducked under the voice).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const [audioDir, work, out] = process.argv.slice(2, 5);
const rep = JSON.parse(fs.readFileSync(path.join(audioDir, "report.json"), "utf8"));
const ids = [...Array(15)].map((_, i) => i + 1);
const D = ids.map((i) => rep[i].seconds), total = D.reduce((a, b) => a + b, 0);
fs.mkdirSync(path.join(out, "stems"), { recursive: true });
const ff = (...a) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...a], { maxBuffer: 1 << 28 });
// stems
fs.writeFileSync(path.join(work, "voice.txt"), ids.map((i) => `file '${path.join(audioDir, `s${i}.wav`)}'`).join("\n"));
ff("-f", "concat", "-safe", "0", "-i", path.join(work, "voice.txt"), "-c", "copy", path.join(out, "stems/voice.wav"));
// generated sfx and music stems (audio/make-sound.py), ducked under the voice
execFileSync(process.env.PY || "python3", [path.join(path.dirname(new URL(import.meta.url).pathname), "audio/make-sound.py"), path.join(audioDir, "report.json"), path.join(out, "stems/voice.wav"), path.join(out, "stems")], { stdio: "inherit" });
// mix: plain sum, no extra gain on the voice (already -16 LUFS, one limiter); sfx and music are ducked stems far below it
ff("-i", path.join(out, "stems/voice.wav"), "-i", path.join(out, "stems/sfx.wav"), "-i", path.join(out, "stems/music.wav"), "-filter_complex", "[0][1][2]amix=inputs=3:normalize=0:duration=first,volume=-0.2dB", "-ar", "48000", path.join(work, "mix.wav"));
// video
const files = ids.map((i) => (i === 1 ? path.join(work, "story1.mp4") : i === 2 ? path.join(work, "story2.mp4") : path.join(work, "vid", `s${i}.mp4`)));
const parts = ids.map((i, k) => `[${k}:v]fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration=1,trim=duration=${D[k].toFixed(3)},setpts=PTS-STARTPTS[v${k}]`);
parts.push(ids.map((_, k) => `[v${k}]`).join("") + `concat=n=${ids.length}:v=1:a=0[v]`);
ff(...files.flatMap((f) => ["-i", f]), "-i", path.join(work, "mix.wav"), "-filter_complex", parts.join(";"), "-map", "[v]", "-map", `${files.length}:a`, "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", total.toFixed(3), path.join(out, "rca-pilot-walkthrough.mp4"));
console.log("total", total.toFixed(2), "s ->", path.join(out, "rca-pilot-walkthrough.mp4"));
