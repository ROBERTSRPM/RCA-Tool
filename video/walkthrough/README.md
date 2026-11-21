# RCA Pilot walkthrough video (13:38)

REVIEW COPY ONLY: nothing here has been uploaded, published, embedded or linked. The owner approves first.

- Inputs: `script.md`, `voiceover-for-walkthrough.txt` (read text), `example-data.md` (every value typed on screen), `recordings/voiceover-part1.m4a` (scenes 1 to 9), `recordings/voiceover-part2.m4a` (scenes 10 to 15).
- Output (git-ignored): `out/rca-pilot-walkthrough.mp4` (1080p, H.264, AAC, -16 LUFS), `out/stems/` (voice, sfx, music placeholder), thumbnails (also in `youtube/`).
- Voice: `audio/process.py` (cuts and the explainer chain), `audio/make-sound.py` (generated SFX and music stems, ducked under the voice), `audio/transcribe.py`, `redo-audio.sh` (re-make everything after the owner's scene-10 re-records), `audio/mix.sh` is not used here; see `audio-edit-log.md`.
- Screen capture (`capture/`): Playwright, frame by frame, 1920x1080 (1440x810 CSS px at 1.333x), cursor overlay and account email hiding injected in the recording browser only. `node scenes.mjs N` records scene N (3 to 15) on the Vercel preview as qa-user-b, after replaying earlier scenes instantly to rebuild the investigation. Real AI is used in scenes 4, 10, 12 and 14. Env: `SCRATCH` (holds `qa_password.txt`), `DEMO_BASE` (preview URL), `DEMO_SHARE` (share link, never stored in the repo), `CLIPS`. Wipe the QA account's investigations and assets before scenes 3, 13, 14 and 15 (dashboard and asset register).
- Edit: `plan.src.json` pins capture beats to spoken phrases; `node build.mjs <clips> <audio dir> <work dir>` retimes clips to the voice, overlays key-term captions and encodes one file per scene; `remotion/` renders the two story scenes (`Scene1`, `Scene2`), the end card and the thumbnails; `node assemble.mjs` joins everything with the audio stems; `node gen-srt.mjs <audio dir>` writes `captions.srt` from the spoken timings.
- Upload text for the owner to review: `youtube-upload.md`.

- Framing and highlights: the capture keeps every filled box in the upper-middle band of the screen (`capture/ctx.mjs`, `ensureVisible`), records the screen rectangle of key numbers (`*.rects.json`), and `build.mjs` draws a subtle orange box and glow round them while the voice says them (`highlights` in `plan.src.json`).
- Review documents: `claims-audit.md` (every spoken claim against the screen), `audio-edit-log.md` (cuts, every Retake, sound design and its sources).
