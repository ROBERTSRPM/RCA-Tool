# RCA explainer: animation (Remotion)

Silent 1920x1080, 30 fps animation for the root cause analysis explainer. Built with Remotion (React + SVG).
All numbers come from `../case-study.md`; scene content follows `../script.md`.

## Setup (once)

```bash
cd video/animation
npm install
```

The browser is the Chromium already installed on this machine. `remotion.config.ts` points Remotion at
`/opt/pw-browsers/chromium` (override with `CHROMIUM_PATH=/path/to/chrome`). Nothing is downloaded.

## Preview

```bash
npm run preview          # opens Remotion Studio
```

In the Studio sidebar pick `RCA` (the whole video) or any single scene (`s01` to `s17`) to scrub and play.
Edits to `scenes.json` or the code hot-reload.

## Re-time the scenes

Edit `scenes.json`. Each entry has an `id` and a `duration` in seconds:

```json
{"id": "s11", "title": "Worked example: the loss", "duration": 33}
```

Every animation beat inside a scene is a fraction of that scene's duration, so changing a duration stretches or
compresses the whole scene. After recording the voiceover, set each duration to the length of that scene's audio.
Scenes 2 and 7 are the `[OWNER]` story title cards; scene 7 is optional: to cut it, delete its entry from `scenes.json`.

## Render

```bash
npm run render                              # full video -> ../out/rca-explainer-silent.mp4
npx remotion render src/index.ts s13 ../out/s13.mp4   # one scene
npx remotion still src/index.ts s13 ../out/s13.png --frame=600   # one frame
node scripts/stills.mjs ../out/stills all 0.5,0.97   # mid and end still of every scene (QA)
```

A full render takes roughly 20 to 30 minutes on 4 cores. Add `--concurrency=4` to use all cores.

## Add the voiceover later

1. Put the recording in `public/`, for example `public/voiceover.mp3`.
2. In `scenes.json` set `"audio": "voiceover.mp3"` and re-time the scene durations to match the audio.
3. Re-run `npm run render`. The audio is muxed into the MP4.

Alternative without touching the project: render silent, then mux with ffmpeg:

```bash
ffmpeg -i ../out/rca-explainer-silent.mp4 -i voiceover.mp3 -c:v copy -c:a aac -shortest ../out/rca-explainer.mp4
```

## Layout

- `scenes.json`: scene ids and durations (the only timing file)
- `src/Root.tsx`: composition list (full video plus one composition per scene)
- `src/lib.tsx`: palette, fonts, easing, `useScene()` progress helper, shared shapes
- `src/scenes/a.tsx` to `e.tsx`: scenes 1 to 17

The MP4 output (`../out/`) and `node_modules` are git-ignored via `../.gitignore`.
