# Walkthrough voiceover edit log

Sources: `recordings/voiceover-part1.m4a` (10:40, scenes 1 to 9 used) and `recordings/voiceover-part2.m4a` (5:41, scenes 10 to 15 used; as instructed, scenes 10 onwards come from part 2 only). AAC mono 48 kHz, phone recording. Raw loudness about -22 LUFS (the demo recording was -31), so only about +8 dB of gain was needed (the demo needed about +20 dB). Room floor about -82 dBFS, so no noise problem.
Method: Whisper small.en (faster-whisper, script as prompt) on each part and again on each edited scene; cuts placed on the recording's own silences (the rooms are digitally quiet between phrases), not on Whisper word times, which drifted by up to 1.3 s in places (scene 12's lead-in). Code: `audio/process.py`, sound: `audio/make-sfx.py`.

## Chain (follows the explainer's edit log; the owner prefers that voice to the demo's)
1. 30 ms fades at every cut; 0.2 s of silence at joins; 0.5 s lead and 0.8 s tail on every scene file. Only silences over 2.2 s inside kept speech are shortened (to 1.4 s); none needed it. Natural pauses are kept.
2. High-pass 80 Hz (4th order), then a gentle spectral noise reduction (stationary, `prop_decrease` 0.75, profile from the quietest 12 % of frames), a light gap expander (up to 8 dB below the floor plus 6 dB) and a light compressor (2.2:1, 20 ms / 200 ms).
3. Gentle EQ to match the explainer: +1.5 dB at 150 Hz and +2 dB at 4 kHz (measured below).
4. No de-esser: the measured 4 to 7 kHz band is not harsh (the demo needed one because that recording was 20 dB quieter and the gain exposed a harsh "s").
5. ONE common gain (+8.3 dB), then a single 5 ms look-ahead limiter at -2.2 dBFS. The gain is refined so the joined result is -16.0 LUFS integrated.
6. Final mix adds no gain and no second limiter: voice stem plus the very quiet sound stem, a plain sum.

## Comparison with the explainer's processed voice (`animation/public/audio/full-preview-enhanced.mp3`, speech frames, long-term spectrum)
| | Integrated | Sample peak | 100-200 Hz | 200-400 | 400-800 | 1.6-3.2 k | 3.2-6.4 k | 6.4-12 k |
|---|---|---|---|---|---|---|---|---|
| Explainer | -16.5 LUFS | -2.1 dBFS | +7.6 | +8.1 | +7.2 | -2.1 | +1.3 | -5.7 |
| Walkthrough voice | -16.1 LUFS | -2.2 dBFS | +6.7 | +7.4 | +6.4 | -2.1 | -0.1 | -6.5 |
(levels relative to the 800 to 1600 Hz band). Every band is within 1.5 dB. Final video audio: see the report in the hand-off message (about -16 LUFS, true peak under -1.5 dBTP).

## Takes and cuts (source seconds in the named part)
Spoken scene numbers ("Scene 4"), "Retake" calls and aborted takes were removed. Scene 1 to 9 are part 1; 10 to 15 are part 2.
| Scene | Kept | Removed |
|---|---|---|
| 1 | 2.3 to 65.0 | |
| 2 | 68.1 to 124.5 | "Scene 2" |
| 3 | 128.35 to 150.0 | "Scene 3" |
| 4 | 153.4 to 198.9, 215.3 to 233.3 | two aborted takes of "It also lists what's missing under not in your notes" (200 to 213); the third, complete take is kept |
| 5 | 235.3 to 263.4 | |
| 6 | 274.2 to 376.3 | first take of the first two sentences, "Retake" |
| 7 | 378.0 to 424.2 | |
| 8 | 426.4 to 486.9, 499.9 to 524.5 | first take of "Operators raised the speed...", "Retake", a second aborted take; the third is kept |
| 9 | 529.0 to 566.0 | |
| 10 | 4.0 to 63.8 | |
| 11 | 79.8 to 137.8 | first take of the opening ("...a list of we, retake"), "Scene 11" |
| 12 | 140.9 to 160.6 | spoken "Scene 12" |
| 13 | 162.5 to 228.5 | |
| 14 | 231.9 to 257.0 | |
| 15 | 260.1 to 288.6, 294.2 to 335.0 | aborted "and the proof the countermeasure works in...", "Retake" |
Scene 10 in part 1 (567 to 615 s) was ignored, as instructed.

## Where the owner's words differ from the read text (Whisper on the final scene files; the screen follows what was said)
- Scene 3: "So where do we start?" (text: "do you start"); "an email and password" (text: "an email and a password").
- Scene 10: "I link the film inspection" (text: "film specification"). The screen links the film evidence item, so it still matches.
- Scene 10: the Cause coach and Challenge results are whatever the real AI returned that run, so the spoken examples (product on the flange, gas mix) do not match the suggestions on screen exactly. The voice is the owner's script; the screen shows real, unscripted output.
- Possible small differences hidden by recogniser noise: "jaw" is heard as "job", "silicone" as "silicon", "cause tree" as "course tree"; these are treated as recogniser noise. In scene 15 the final word of "the actions still open" was not detected by the recogniser on the processed file (it is present and clear in the source); please check by ear.

## Sound design (scene 1 only) and where a licensed track or SFX goes
- Generated, no samples: tray-sealer hum and thump (0 to 28 s), leak-tester bubbling (13.5 to 19 s), two phone rings (29.4 s and 34.0 s, different tones), a faint room tone in the meeting room, then silence on the final question (from 54.4 s). Peak -20 dBFS, far under the voice; no music anywhere.
- Stems are written to `out/stems/` (git-ignored): `voice.wav` (the edited voice, -16 LUFS), `sfx.wav` (the generated sound), `music.wav` (silent placeholder). The final mix is `voice + sfx + music` with no gain. To use a licensed music track or real SFX: put them in `music.wav` / `sfx.wav` (same length, 48 kHz mono), keep music at least 20 dB under the voice and duck it under speech, and re-run `node assemble.mjs`. The script's [MUSIC] cues are: scene 1 low tense pad from 0:03 (fade on the last question), scene 2 calm bed from the first word, scene 6 soft pulse as the total builds, scene 15 calm bed returning under the end card.
