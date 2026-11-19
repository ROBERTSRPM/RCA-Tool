# RCA Pilot product demo video

- `script.md`: voiceover script (8 scenes, target 2:00). `recording-guide.md`: instructions for the owner's phone recording.
- `capture/`: Playwright screen capture of the sample P-101 investigation (1440x810 CSS px at 1.333x = 1920x1080, frame by frame, cursor overlay and account email hiding injected in the recording browser only).
  - `node scenes.mjs prep` resets the sample data, `node scenes.mjs 1` to `8` records one scene into `$CLIPS` (default `$SCRATCH/clips`).
  - Environment: `DEMO_BASE` (preview URL), `SCRATCH` (holds `state.json` with the signed-in session and `qa_password.txt`). Secrets are never in the repo.
  - `mockai.mjs` (`DEMO_MOCK_AI=1`) replaces `/api/ai/*` in the recording browser only. Use it only when the account has hit its daily AI limit; otherwise record with real calls.
  - Re-record order matters: scenes 6 and 7 first (after `prep`), then 4, 5, 8, because accepted AI suggestions change the sample.
- `login.mjs` saves a signed-in session to `$SCRATCH/state-b.json` (user from `DEMO_USER`, password from `$SCRATCH/qa_password.txt`; never committed). The final capture is from the live site (`DEMO_BASE=https://www.rcapilot.com`) with real AI calls.
- `audio/process.py` and `audio/mix.sh`: clean, cut and enhance the owner's recording (`recordings/voiceover-original.m4a`); see `audio-edit-log.md`.
- `plan.src.json`: per-scene cues pinning capture marks to voice moments, plus captions, zooms and highlights (scene seconds). `node build-plan.mjs <clips dir> <scene wav dir>` writes `remotion/plan.json` and copies clips and wavs into `remotion/public/` (git-ignored).
- Final render: render `Demo` (video only), then mux with the joined voice track: `ffmpeg -i out/demo-video-only.mp4 -i voice-final.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k out/rca-pilot-demo.mp4`. Thumbnail: render composition `Thumb`. YouTube text: `youtube-upload.md`.
- `remotion/`: Remotion composition `Demo` (uses `../animation/node_modules`; run `npm install` in `video/animation` once).
  `cd remotion && ../../animation/node_modules/.bin/remotion render src/index.ts Demo ../out/demo-silent-preview.mp4 --concurrency=4`
- `gen-srt.mjs <audio dir>` writes `captions.srt` from the script text and the spoken word times.
- `out/` (git-ignored): rendered media.
