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

## "Retake" audit (owner rule: "retake" means the line was redone; cut the word and the mistaken take before it, keep only the redo)
Method: Whisper (small.en) on both recordings with word times, plus a scan for every short isolated utterance in the recordings (each one transcribed on its own), and a final check of the first and last 3 seconds of every kept piece (spoken scene numbers, "retake"). Every "Retake" found, and what was cut (source seconds in the named part):
| # | Where | Mistaken take(s) cut | The word | Kept |
|---|---|---|---|---|
| 1 | Part 1, scene 4 | two aborted takes of "It also lists what's missing under not in your notes" (200.1 to 212.6) | "Retake" at 213.8 and a second "Retake" at 215.6 to 216.1 (a first version of this edit kept the second one; it is cut now) | complete third take from 216.55 |
| 2 | Part 1, scene 6 | first take of "Step 2 is the loss. This is the one the general manager cares about." (266.1 to 272.5) | "Retake" 273.0 | second take from 274.2 |
| 3 | Part 1, scene 8 | first take of "Operators raised the speed and cut the dwell time to keep up." (487.1 to 493.3); an aborted "Operators" (496.6) | "Retake" at 494.4 and again at 498.6 | third take from 499.9 |
| 4 | Part 2, scene 11 | first take of "Step 5 is actions. This is where a lot of RCAs quietly die, in a list of we..." (66.9 to 75.0), then "Scene 11" | "retake" 75.3 | second take from 79.8 |
| 5 | Part 2, scene 15 | "and the proof the countermeasure works in..." (289.7 to 292.1) | "Retake" 292.6 | complete take from 294.2 |
| 6 | Part 1, scene 10 region (596 to 633) | not used: scene 10 comes from part 2 | "retake" at 597.1, 615.7, 632.5 | n/a |
| 7 | Part 2, after the last line | not used (after the end of the kept audio) | "Retake" at 336.7 | n/a |
No "retake" is left in the final audio. The edit-boundary check of all 22 kept pieces shows no spoken scene number or "retake" at any head or tail.

## Takes and cuts (source seconds in the named part)
Spoken scene numbers ("Scene 4") and "Retake" calls were removed. Scenes 1 to 9 are part 1; 10 to 15 are part 2. In scene 10 two sentences are cut as separate pieces so they can be replaced later (see below).
| Scene | Kept | Removed |
|---|---|---|
| 1 | 2.3 to 65.0 | |
| 2 | 68.1 to 124.5 | "Scene 2" |
| 3 | 128.35 to 150.0 | "Scene 3" |
| 4 | 153.4 to 198.9, 216.55 to 233.3 | retake 1 above |
| 5 | 235.3 to 263.4 | |
| 6 | 274.2 to 376.3 | retake 2 |
| 7 | 380.4 to 424.2 | spoken "Scene 7" (377.4 to 378.2) |
| 8 | 426.4 to 486.9, 499.9 to 524.5 | retake 3 |
| 9 | 529.0 to 566.0 | |
| 10 | 4.0 to 63.8 (five pieces) | |
| 11 | 79.8 to 137.8 | retake 4 |
| 12 | 140.9 to 160.6 | spoken "Scene 12" |
| 13 | 162.5 to 228.5 | |
| 14 | 231.9 to 257.0 | |
| 15 | 260.1 to 288.6, 294.2 to 335.0 | retake 5 |
Whisper word times drifted by up to 2.4 s in places (scene 7 and scene 12 lead-ins, the scene 4 retake), so every cut is placed on the recording's own silences and checked on the processed audio.

## Where the owner's words differ from the read text (Whisper on the final scene files; the screen follows what was said)
- Scene 3: "So where do we start?" (text: "do you start"); "an email and password" (text: "an email and a password").
- Scene 10: "I link the film inspection" (text: "film specification"). The screen links the film evidence item, so it still matches.
- Scene 10: the Cause coach and Challenge results are whatever the real AI returned that run, so the spoken examples (product on the flange, gas mix) do not match the suggestions on screen exactly. The voice is the owner's script; the screen shows real, unscripted output.
- Possible small differences hidden by recogniser noise: "jaw" is heard as "job", "silicone" as "silicon", "cause tree" as "course tree"; these are treated as recogniser noise. In scene 15 the final word of "the actions still open" was not detected by the recogniser on the processed file (it is present and clear in the source); please check by ear.

## Sound design and music (round 2: all sounds added)
Every sound is generated by `audio/make-sound.py` from noise and sine waves. No sample, loop, library track or recording from anywhere else is used, so there is nothing to license and no source to credit. (Sources used: none external. If a CC0 or public-domain sound is added later, record its source and licence here.)
Stems are written to `out/stems/` (git-ignored): `voice.wav` (the edited voice), `sfx.wav`, `music.wav`. The final mix is their plain sum. Both sound stems are ducked under the voice (speech-driven envelope: SFX 7 dB, stings 9 dB while anyone is speaking), and measured with the voice: the voice stem is -16.0 LUFS integrated with one limiter (in the voice chain only). The full mix is the plain sum trimmed by 0.2 dB so the true peak stays under -1.5 dBTP: measured on the final file (AAC) -16.3 LUFS integrated, true peak -1.6 dBTP. SFX stem alone -38 LUFS and music stem alone -36 LUFS; during speech they sit about 20 dB or more under the voice (the SFX and music are ducked 7 and 14 dB while someone speaks).
- Scene 1 (script [SFX] cues): night-shift plant ambience (50 Hz mains hum and harmonics, low rumble, ventilation hiss) from the first second; conveyor rattle; tray-sealer pneumatic thunk and release hiss every 1.1 s with the odd tray clink; three packs set on the table; a splash as the pack goes into the leak tester and bubbling under "two of them leak"; plastic hold tags slapped on the pallets (20.5, 21.7, 22.9 s); a bedside room tone; two phones at "Then the phones start ringing" (29.4 s, vibration buzz plus a two-note digital ring) and at "the QA manager's" (34.0 s, a different three-note tone); six soft taps counting the events, the sixth lower; the meeting-room tone; then all sound cut on the final question (54.4 s) and silence.
- Scene 2: a soft tick as each of the four aims and each of the five figures appears.
- Scene 13: a soft two-note chime as the verified saving is spoken. End card: one soft low tone.
- Music (owner round 3): no music bed anywhere under speech. Only two short, soft bell stings remain, generated the same way: one on the opening title (scene 1 start) and one at the start of the closing card (found from the spoken "You can try"). Each is ducked 9 dB under any speech and is not heard over the voice. SFX are kept.
- To use a licensed track or real sound effects instead: replace `music.wav` / `sfx.wav` (48 kHz mono, same length), keep them well under the voice and duck them, then run `node assemble.mjs`. Record the source and licence in this file.

## Owner's re-recorded scene 10 lines (now in the video)
`recordings/scene10-rerecord-original.m4a` (17.8 s, AAC mono 48 kHz, one file with both lines). Whisper (small.en) and an energy scan show one clean take of each line, no "retake" and no mistaken take, so nothing was dropped: line (a) 1.8 to 10.6 s, line (b) 13.3 to 16.7 s (a 2.7 s silence between them). Split into `recordings/scene10-line-a.wav` (1.60 to 10.85 s) and `scene10-line-b.wav` (13.20 to 16.90 s), then `audio/process.py` replaced the two original sentences (part 2, 32.2 to 40.2 s and 55.3 to 59.8 s) with them, level-matched to the sentences they replace (+1.6 dB and +1.7 dB raw), and ran the same chain as the rest (80 Hz high-pass, gentle noise reduction, EQ, light compressor, the one common gain and limiter). The re-record's noise floor is -85 dBFS, the same as the main recordings, so no extra noise work was needed.
- (a) "It also suggests the seal plate is marked and not flat. The inspection found those marks. So that one goes in too."
- (b) "That's fair, so I link the film specification."
Scene 10 is now 62.4 s (was 61.0 s). The screen cues are anchored to spoken phrases, so the accept click for the seal-plate suggestion now lands as the owner says "seal plate", and the film evidence is linked on "That's fair". To redo this after any new take: `redo-audio.sh`.

## "Chicken and rice" removed (round 2)
The words were in the typed shift notes, the draft problem statement and the Product field. They are removed from `example-data.md` and `capture/data.mjs`, and scenes 4 to 15 were re-captured from scratch. The AI then returned a "food residue or sauce on the tray flange" suggestion and a "seal plate is marked, so the jaw does not press evenly across the flange" suggestion in scene 10 on its own; both are accepted on screen. The Challenge step put "No change control for film supplier or specification, root cause not verified" first, and the film specification evidence item is then linked and the cause set to Verified.

## Owner's second re-record (now in the video)
`recordings/rerecord-2-original.m4a` (12.9 s). Whisper (small.en): one clean take of each line, no "retake", so nothing was dropped.
- Scene 11: "Preventive actions stop it from coming back." (file 1.15 to 4.95 s) replaces the read line (cut table: scene 11, piece tagged `p`).
- Scene 15: "So let's go back to that Thursday morning, and that meeting." (file 6.55 to 11.55 s) replaces the opening line (piece tagged `o`).
This phone file has a noisier floor (about -52 dBFS against -82 dBFS in the main recordings). `audio/process.py` therefore cleans such a file with its own noise profile (first 0.4 s) and gates the gaps at -24 dB. The gaps around both inserted lines sit at about -88 to -93 dBFS, like the rest of the scene. Level-matched gain: +3.3 dB (scene 11), +4.0 dB (scene 15). Scene 11 is now 59.6 s, scene 15 70.5 s.

## Final render (round 3)
Length 13:38.3 (818.33 s), 1080p30 H.264, AAC. Integrated loudness -16.2 LUFS, LRA 4.1 LU, true peak -1.7 dBTP, one limiter on the voice. Whisper on the finished file: first words "It's four o'clock in the morning on a Thursday", last words "You can try it at www.rcapilot.com. The link is in the description." No "retake" or scene number is spoken anywhere.

## Owner's scene 1 re-record: the phones line (in the sources, not yet rendered)
`recordings/scene1-line-phones-original.m4a` (10.8 s). Whisper (small.en): one clean take, "Then the phones start ringing. First the production manager at home, then the QA manager." (1.1 to 8.08 s). No "retake" word and no earlier mistaken take, so nothing was cut and that single take is used. `recordings/scene1-line-phones.wav` is the file from 0.95 to 8.4 s (0.15 s of room tone before, 0.3 s after).
- Replaces "Then the phones start ringing: first the production manager's at home, then the QA manager's." in scene 1 (piece tagged `s`, source part 1, 30.05 to 37.9 s). The quiet room (-73 dBFS lead-in) needs no extra noise work: the normal chain applies. The loudness match is measured on the processed scene: the integrated match alone left the line about 3 dB too loud against the sentences around it, so `TRIM_DB["s"] = -3.0 dB` is applied. Speech medians now: before the line -15.9, the line -15.4, after -15.0 (dB, 50 ms frames).
- Pauses kept: before the line 1.64 s (was 1.60), after it 1.14 s (was 1.10). The cuts sit in room tone at -80 dBFS.
- Scene 1 is 63.89 s (was 63.86 s), so every later cue is within 0.05 s of where it was. New word times in the scene: "Then" 28.52, "phones" 29.50, "First" 31.26, "Production Manager" 32.04 to 32.88, "then" 34.06, "QA" 34.84, "Manager" 35.22 to 35.64, "A retailer" 36.74.
- The second phone (ring tone and buzz in `make-sound.py`, and the second phone illustration in `remotion/src/Story.tsx`) now starts at 34.8 s, on "QA Manager". The first ring is unchanged at 29.4 s. The phone labels read "Production Manager" and "QA Manager". The story animation video itself has to be re-rendered with the final render; it has not been.
- Whisper on the spliced scene 1, 25 to 40 s: "goes on hold. Then the phones start ringing. First the production manager at home, then the QA manager. A retailer already complained about slack packs".
