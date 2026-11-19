# Demo voiceover edit log

Source: `recordings/voiceover-original.m4a` (AAC mono 44.1 kHz, 3:33.4, phone recording, owner reading `voiceover-to-read.txt`).
Output: `s1.wav` to `s8.wav` (48 kHz mono 16-bit, one per scene; not in git, rebuild with `audio/process.py`) and the joined, normalised track used in the final video.
Method follows `../animation/public/audio/edit-log.md`. I cannot listen, so every choice rests on a Whisper transcript (faster-whisper small.en, run on the original and again on each edited scene) and measurements.

## Takes and cuts (source seconds)
Unlike the earlier recording, this one is not digitally silent between words: the room floor is about -70 dBFS in pauses and the speech about -35 dBFS. Cut points were chosen from the word times and then snapped to the quietest 20 ms frame within 0.12 s, so no cut falls inside a word. Every segment has 30 ms fades.

| Scene | Kept (source) | Removed |
|---|---|---|
| 1 | 3.15 to 22.45 | spoken "Scene 2" at 22.8 |
| 2 | 25.05 to 55.30 | spoken "Scene 2" (22.8 to 24.1), "Scene 3" at 57.4 |
| 3 | 58.9 to 73.5 | spoken "Scene 3" and "Scene 4" (75.5) |
| 4 | 76.5 to 95.76, 107.38 to 111.5, 112.4 to 121.4 | the two failed takes of "Challenge my analysis points out weak links" (93.8 to 106.0). The first take supplies "...you may have missed, and", the third (107.38 to 111.5) supplies "Challenge my analysis points out weak links" |
| 5 | 127.35 to 153.8 | "Now, scene 5" (123.2 to 127.0); the "Now" that opens "Now, actions" is kept |
| 6 | 155.3 to 173.8 | spoken "Scene 6" |
| 7 | 176.65 to 188.6 | spoken "Scene 7" |
| 8 | 193.3 to 208.62 | spoken "Scene 8" |

Joins inside scene 4 use 0.18 s of silence. No pause was longer than 1.3 s inside a kept segment, so none were shortened (the script checks and would shorten to 1.0 s). Each scene file has 0.25 s lead and 0.45 s tail.

## Enhancement chain (all scenes identical, `audio/process.py`)
1. High-pass 80 Hz, 4th order Butterworth.
2. Spectral noise reduction (`noisereduce`, stationary, `prop_decrease` 0.85, FFT 2048, 400 Hz and 60 ms smoothing), noise profile from the quietest 12 % of 20 ms frames of the whole recording.
3. Downward expander in the gaps: below the speech threshold minus 6 dB, up to 12 dB reduction, 5 ms attack, 150 ms release.
4. Light compressor: threshold -22 dB, ratio 2.2:1, 20 ms attack, 200 ms release.
5. De-esser: 4.5 to 9.5 kHz band only, attenuated (up to 10 dB, 1 ms attack, 30 ms release) while it is above the 85th percentile of its level in speech. The phone mic gave a harsh 's' (the 4 to 7 kHz band was 25 dB above the speech band on "suggest" in scene 5); after the de-esser it is 19 dB, about 7 dB lower.
6. One common gain (+14.9 dB, from -30.9 LUFS raw to -16 LUFS joined) and a 5 ms look-ahead limiter at -2.2 dBFS.
7. Final mix (`audio/mix.sh`): scenes joined, +5.5 dB, look-ahead limiter at 0.78 (-2.2 dB). Measured on the final video's audio (AAC 192 kbps) with ebur128: -14.1 LUFS integrated, peak -1.8 dBFS.

Checks: each edited scene was re-transcribed and matches the script (see differences below). A first version of the limiter wrote zeros over stretches of the audio; it was found because the transcript of the edited files lost words, and fixed before the files were used.

## Wording differences from the script (as spoken, kept)
- Scene 2: "Add the downtime" is transcribed "At the downtime" (probably "Add"). "These figures are illustrative" is transcribed "illustrating" in the plain pass and "illustrative" with the script as a prompt (probably "illustrative"). The loss is said as "about two hundred and thirty-eight thousand dollars a year".
- Scene 4: "The AI suggests. You decide." is spoken with a very short pause, so captions show it as two cues.
- Scene 8: "decide" is transcribed "design" in the plain pass; the prompted pass gives "decide".
- Please check by ear: the join in scene 4 after "you may have missed, and", the start of scene 5 ("Now, actions"), and scene 2's "illustrative".

## Correction (owner report: "the .com is missed")
- Scene 8 was cut at 208.0 s, but "dot com" was spoken at 208.05 to 208.45 s (a 0.4 s gap after "pilot" had hidden it). The cut now ends at 208.62 s and the scene has 0.8 s of room tone after the last word (was 0.45 s). The end card now starts when "Try it at" begins and runs to the end of the scene (6.5 s).
- Scene 4 had a doubled "and" at the join ("missed, and and Challenge..."): the third take's lead-in "and" (106.84 to 107.2) was kept as well. Take 3 now starts at 107.38 s, at "Challenge".
- Word-by-word check of the final mix (Whisper on the final audio) against `voiceover-to-read.txt`: every scene starts and ends on its script words; no clipped first or last words. Differences are recogniser noise or the owner's wording ("an owner and a due date" is heard as "an owner and due date").

## Owner feedback (2026-11-19) and rule for the next video
The owner prefers the explainer's voice: this demo's voice "blasts off". Likely causes, measured above:
- The final mix added +5.5 dB on top and limited twice, reaching -14.1 LUFS. The explainer was -16 LUFS with one limiter.
- The phone recording was quiet (-30.9 LUFS raw), so about +20 dB of total gain also lifted room noise and harshness.

For the walkthrough and later videos:
- Follow the explainer chain in `video/animation/public/audio/edit-log.md`.
- Target -16 LUFS, with no extra gain in the final mix and a single limiter.
- Use the de-esser only if measured harshness calls for it, and gently.
- Before rendering, compare 20 s of the new voice with the explainer (loudness and spectrum) and match them.
- Ask the owner to record closer to the phone (10–15 cm) in a soft room so less gain is needed.
