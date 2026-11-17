# RCA explainer: animation (Remotion)

1920x1080, 30 fps animation for the root cause analysis explainer. Built with Remotion (React + SVG).
All numbers come from `../case-study.md`; scene content follows `../script.md`; the words are `../voiceover.txt` (final).
The presenter appears on camera, so every scene has a presenter mode (see "Presenter and audio" below).

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

In the Studio sidebar pick `RCA` (the whole video) or any single scene (`s01` to `s06`, `s08` to `s17`; there is no scene 7) to scrub and play.
Edits to `scenes.json` or the code hot-reload.

## Re-time the scenes

Edit `scenes.json`. Each entry has an `id`, a `title`, a `duration` in seconds and the presenter fields:

```json
{"id": "s11", "title": "Worked example: the loss", "duration": 33, "presenter": "none", "presenterVideo": null, "audio": null}
```

Animation beats are no longer fractions of the scene. Each beat is a cue in `cue-spec.json` (key -> spoken phrase), resolved against the
word timings in `public/audio/timing/sXX.json` by `node scripts/make-cues.mjs` (writes `src/cues.json`, `--table` prints beat vs phrase times).
Scenes call `q("key", offsetSeconds)`. After re-recording a scene: re-transcribe it into `timing/`, rerun make-cues, and set `duration` to the audio length plus 0.5 s.
Count-ups end when the unit word is spoken (`hrsend`, `tonnesend` in scene 16).
Scene 7 no longer exists: the ids are `s01` to `s06` and `s08` to `s17`. Scene 2 is the presenter's bucket conveyor story;
its animation is only a fallback card.

## Presenter and audio

Each scene has a `presenter` mode in `scenes.json`:

| Mode | Scenes | Meaning |
|---|---|---|
| `full` | s01, s02, s17 | Presenter fills the screen (cover fit). The animation underneath is only a fallback. |
| `corner` | s03, s04, s05, s06, s08, s09, s10 | Picture-in-picture, bottom right: rounded rectangle 440 x 248 px, 48 px from the right and bottom edges (x 1432 to 1872, y 784 to 1032). The animation keeps all text and diagrams out of that box plus a 24 px margin (x >= 1408 and y >= 760). |
| `none` | s11 to s16 | Voice only. The animation uses the whole frame and only the clip's audio is played. |

### Drop the clips in here

Put the recordings in **`/home/user/rca-platform/video/animation/public/presenter/`** (the folder already exists, empty), one file per scene, for example `s01.mp4`, `s03.mp4`, ... `s17.mp4`. Then point each scene at its file in `scenes.json`, relative to `public/`:

```json
{"id": "s03", "title": "What RCA is", "duration": 33, "presenter": "corner", "presenterVideo": "presenter/s03.mp4", "audio": null}
```

- `presenterVideo`: video file for the scene. `full` scenes show it full frame (cover fit); `corner` scenes show it in the corner box with rounded corners and a thin border; `none` scenes play only its audio track. In every case its audio track is used.
- `audio`: optional separate audio file (for example `presenter/s11.wav`). If set, it is played instead of the clip's own audio (the clip is muted).
- With no file given (`null`) the scene renders exactly as before: animation only, silent. A missing file path makes the render stop with a clear error.
- Set `duration` to the clip length in seconds (rounded up) so the animation and clip end together. Clips are cut to the scene length.
- The old whole-video `"audio"` at the top of `scenes.json` still works for one continuous voiceover; do not use it together with per-scene clips.

### Check the layout (debug placeholder)

Corner scenes can draw the presenter box as a labelled "Presenter" placeholder (plus the 24 px keep-out margin as a dashed outline). It is off by default and only drawn when no clip is set.

```bash
# stills of every scene at 35%, 70% and 98% with the placeholder on
PRESENTER_DEBUG=1 node scripts/stills.mjs ../out/stills all 0.35,0.7,0.98
# one scene in the Studio or CLI with the flag as a prop
npx remotion still src/index.ts s04 ../out/s04-debug.png --frame=600 --props='{"presenterDebug":true}'
npx remotion studio src/index.ts --props='{"presenterDebug":true}'
# or as an environment variable
REMOTION_PRESENTER_DEBUG=1 npm run preview
```

## Render

```bash
npm run render                              # full video -> ../out/rca-explainer-silent.mp4 (includes any clips and audio set in scenes.json)
npx remotion render src/index.ts s13 ../out/s13.mp4   # one scene
npx remotion render src/index.ts RCA ../out/test.mp4 --frames=0-1799   # first 60 seconds
npx remotion still src/index.ts s13 ../out/s13.png --frame=600   # one frame
node scripts/stills.mjs ../out/stills all 0.35,0.7,0.98   # QA stills (add PRESENTER_DEBUG=1 for the presenter box)
```

The file name `rca-explainer-silent.mp4` is only the default; once clips are in, the render has sound. A full render takes roughly 20 to 30 minutes on 4 cores (video clips add some time). Add `--concurrency=4` to use all cores.

## Alternative: mux audio afterwards

Render without clips, then mux a finished voiceover with ffmpeg:

```bash
ffmpeg -i ../out/rca-explainer-silent.mp4 -i voiceover.mp3 -c:v copy -c:a aac -shortest ../out/rca-explainer.mp4
```

## Layout

- `scenes.json`: scene ids, durations and presenter fields (the only timing file)
- `src/Presenter.tsx`: presenter layer (corner box constants, clip/audio playback, debug placeholder)
- `src/Root.tsx`: composition list (full video plus one composition per scene)
- `src/lib.tsx`: palette, fonts, easing, `useScene()` progress helper, shared shapes
- `src/scenes/a.tsx` to `e.tsx`: scenes 1 to 6 and 8 to 17

The MP4 output (`../out/`) and `node_modules` are git-ignored via `../.gitignore`.
