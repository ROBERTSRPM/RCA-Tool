# Voiceover edit log

Source: 13:33.85 recording, 15 scenes. Output: s01..s17.wav (48 kHz mono 16-bit) and full-preview.mp3 (128 kbps, 0.6 s between scenes).

## Method
- Transcribed with faster-whisper small.en (WAV input). Whisper's word timestamps drift by up to about 1 s in places, so cuts are placed on the recording's own digital-silence gaps (energy below -60 dB for 0.3 s or more), not on the word times. No cut falls inside a word.
- Each speech island was kept whole with 40 ms of padding and a 30 ms fade at each edge.
- Cuts that remove a take are joined with about 0.35 s of silence. Lead and tail of each scene are about 0.25 s.
- Pauses inside a scene longer than 1.5 s were shortened to 0.9 s (19 places, listed below). Speed and pitch are unchanged.
- Loudness: one pass-1 measurement over all scenes joined, then the same +14.7 dB gain for every scene and a 5 ms look-ahead peak limiter at -1.5 dBFS. The recording is quiet and one plosive peaks at 0.77 raw, so a limiter was needed. Result: about -16.2 LUFS integrated over the joined preview, true peak -0.9 dBTP. This is not a literal loudnorm two-pass, because a linear gain keeps the scenes consistent.
- No spoken scene numbers were found. The "one, two, three..." in scenes 8, 9 and 13 are the script's own enumeration and are kept.

## Durations (s)
s01 44.89, s03 40.70, s04 38.27, s05 41.47, s06 43.91, s08 49.85, s09 50.12, s10 40.25, s11 48.10, s12 44.84, s13 60.53, s14 38.24, s15 64.21, s16 62.46, s17 67.24.
Total of scenes: 735.1 s (12:15). Preview mp3: 743.5 s (14 gaps of 0.6 s).

## Cuts (original recording timestamps)
Four takes were removed. Scenes not listed had no mistakes.

1. Scene 8, 252.51-254.07. Removed: "Collect it before anything." The complete take at 254.58-259.24 ("Collect it before anything is cleaned up or thrown away") is kept.
2. Scene 14, 562.14-565.73. Removed: "Flush and oil condition are on ... inspection" (aborted, the word "no" was dropped). The final take at 567.00-570.71, "Flush and oil condition are on no inspection route", is kept.
3. Scene 15, 605.81-611.84. Removed: "Slow the pump down on its variable speed drive so it runs near its best point ..." (trailed off on a garbled word, perhaps "with"). The second take is kept. It was spoken in three phrases: 613.76-616.88 "Slow the pump down on its variable speed drive", 617.73-620.40 "so it runs near its best point", 620.81-622.21 "with the valve wide open". Their original pauses of about 0.85 s are kept.
4. Scene 16, 665.11-672.57. Removed two false starts: "12 months later, the pump has had" and "12 months later, the pump has not had" (spoken as 669.07-670.13, 670.55-671.63 and 671.94-672.57). The complete take at 673.52-676.75, "12 months later, the pump has not had a single breakdown", is kept.

Also trimmed: the silence and a breath/click (584.17-584.37) between scenes 14 and 15, and the gaps between scenes (the 4-5 s gaps at 421-426 and 535-538 hold no speech).

Shortened pauses (original gap to 0.9 s): scene 1 19.0-20.6; scene 8 239.0-240.9, 259.2-260.9; scene 9 281.0-282.7, 300.9-302.7, 310.4-312.2, 315.6-317.4, 322.3-324.1; scene 11 378.5-380.9, 384.9-386.7; scene 12 458.6-460.2; scene 15 596.8-598.4, 622.2-623.8, 625.0-626.9, 631.3-633.2, 647.2-649.0; scene 16 677.9-679.4, 685.2-687.0; scene 17 779.3-781.1.

## Wording differences from the script (final takes kept as spoken)
I cannot listen to the audio. These come from whisper small.en, checked again with the script as a decoding prompt. A difference is listed as probable if it came out the same both ways.
- Scene 3: "A good RCA ends..." is preceded by "The last part matters" where the script says "That last part matters" (probable).
- Scene 5: "never show on the budget line" where the script says "on one budget line" (probable).
- Scene 6: "you can find the whole extra line's worth" where the script says "a whole" (uncertain, it flips with a biased decode). "Add up" was heard as "And up" (probably the script wording, uncertain).
- Scene 8: "It can be hours, tons, dollars" where the script says "Hours, tonnes, dollars". This adds "It can be" (probable). "Tonnes" may be said as "tons" (the transcript spells it "tons", so this is uncertain).
- Scene 17: "check at ninety days again and twelve months" where the script says "at ninety days and again at twelve months" (probable). "I will show more soon" where the script says "share more soon" (uncertain). "Thank you for watching" where the script says "Thanks for watching" (probable).
- Scene 1: "than we can ... count" where the script says "than we care to count" (the transcript says "can", uncertain).

## Unsure / to check by ear
- Scene 11: "and nine thousand five hundred dollars of repair cost" where the script says "Add nine thousand...". The word is a 0.7 s island and may be "Add" or "And".
- Scene 8, "Three, a cause and effect tree": plain whisper hears "a course and a factory". The audio exists and the sentence is complete, so it is kept. It decodes as the script when prompted.
- Scene 13: "fitters" (heard as "feeders" or "fiddlest"), "hoses" ("horses") and "flush" ("flash") are almost certainly the script words, mis-heard by the recogniser. Scenes 9 and 12 had "causes" heard as "courses" and "centre" as "center", and so on. I treated all of these as recogniser noise.
- Scene 15: "That one costs nothing" is heard as "That won't cost nothing" without the script prompt. I treated it as noise.
- Scene 16: "before they fail" is heard as "before they fade" (probably noise).
- Long mid-scene pauses of about 0.85-1.5 s were left as the presenter paced them. Only pauses over 1.5 s were shortened.
- Whisper dropped the first attempt in two places in its full-file pass (scene 15 "Slow the pump down", scene 16 "12 months later" x3). Only a per-phrase transcription exposed them. I re-checked every scene file by re-transcription. No scene shows missing, doubled or clipped words beyond the recogniser noise above, but a listen to the join points would confirm it.

## Audio enhancement (second pass)

Originals are kept in `original/` (the 15 WAVs and the first `full-preview.mp3`). `s01.wav`..`s17.wav` here are the enhanced versions (48 kHz mono 16-bit). Also written: `full-preview-enhanced.mp3` (128 kbps, 0.6 s between scenes, 743.5 s) and `before-after.mp3` (20 s of scene 9 from 8 s to 28 s, original, 0.5 s silence, the same 20 s enhanced; 40.5 s). I cannot listen, so every choice below rests on measurements.

### What the measurements showed (originals)
- The pauses are digital silence: 17-31 % of all samples are exactly 0 and the 0.5 s quietest windows read -66 dBFS or lower (several are -180). So there is no stationary room noise in the pauses to profile. The previous pass already removed it.
- The only low-level, non-zero material is the tail of words and short gaps between words. For those frames (20 ms, -75 to -52 dBFS in the original) the spectrum is flat and hiss-like at about -62 dBFS overall. That is the noise that remains and is what I worked on. Speech runs at about -20 dBFS, so the gap is about 40 dB.
- Hum: no peak at 50, 60, 100, 120, 150 or 180 Hz. The largest line over the neighbouring floor was 2.1 dB (not a tone). No notch was applied.
- Clipping: none (no sample at or above 0.999). DC offset: 1e-6 to 7e-5, nothing to remove (the high-pass takes it anyway).
- Sibilance: 5-9 kHz band power is 3-12 dB below the 1-4 kHz band in speech frames. Not harsh. No de-esser.
- Presence: 3-5 kHz is 7-12 dB below 0.3-3 kHz band power, a normal speech slope, not dull. No presence lift.
- Loudness of the originals: -15.2 to -17.6 LUFS per scene, -16.2 LUFS joined; sample peak -1.5 dBFS (limiter), true peak about -0.9 dBTP.

### Chain (same for all scenes, `scratchpad` scripts, Python: scipy, noisereduce, numba, pyloudnorm)
1. High-pass, 4th-order Butterworth, 80 Hz.
2. Spectral noise reduction, `noisereduce` stationary, `prop_decrease` 0.9, threshold 1.0 sigma, FFT 2048, 400 Hz frequency smoothing, 60 ms time smoothing. The noise profile is taken from the file's own quietest non-zero frames (20 ms frames between -75 and -52 dBFS).
3. Gentle downward expander at the gaps only: below -55 dBFS (20 ms RMS), ratio 1.6:1, at most 8 dB reduction, 5 ms attack, 150 ms release. It lowers the hiss between words and the word tails a little.
4. Light compressor: threshold -22 dB, ratio 2.2:1, 8 dB soft knee, 20 ms attack, 200 ms release.
5. One common gain (+5.8 dB, set from the joined recording so that the joined integrated loudness is -16.0 LUFS), then a 5 ms look-ahead peak limiter with its ceiling at -2.2 dBFS so that the true peak (4x oversampled) stays below -1.5 dBTP.
Not used: notch, de-esser, presence lift (nothing measured that called for them).

### Results
- Noise floor (mean level of the quietest 10 % of non-zero 20 ms frames): about -57 to -64 dBFS before, -61 to -73 dBFS after, i.e. 3.5 to 8.6 dB lower, in absolute terms (mean 5.7 dB), even though the whole file is about the same loudness. The level of the "low frames" (-75 to -52 dBFS band, same frames before and after) falls by 6.7 dB on average (5.9 to 7.6 dB). I stopped there on purpose: the 10-15 dB asked for would need stronger reduction on material that is mostly the decay of words, which risks the underwater sound. The pauses stay digitally silent.
- Integrated loudness: joined -16.03 LUFS (original -16.21). Per scene -15.4 to -16.9 LUFS (originals -15.2 to -17.6), so the spread is smaller.
- True peak: -1.53 to -2.0 dBTP in every scene (original about -0.9), sample peak -2.2 dBFS.
- Speech-band (300 Hz-3.4 kHz) RMS over speaking frames (above -30 dBFS): change -0.22 to +1.04 dB per scene, mean +0.2 dB. All within 1.5 dB.
- Transcription check: scene 5 re-transcribed with faster-whisper small.en from a 16 kHz copy. The words are intact; the original and enhanced transcripts differ in one word (whisper wrote "breakdown" for the original and "breakdowns" for the enhanced, which is what the script says). Word-level similarity 0.99.

## Scene 11 re-record (contribution margin sentence)

New take: `Cont_margin.m4a` (9.86 s, 48 kHz mono AAC), one complete take of "Contribution margin, the selling price minus the variable cost of each tonne, is eighteen dollars." (whisper small.en: "Contribution margin, the selling price minus the variable cost of each ton, is $18"). Speech islands 1.66-2.85, 3.41-6.90, 7.40-8.89 s; the rest is room noise.

### Splice (in the un-enhanced `original/s11.wav`, which is the post-gain domain)
- Old sentence "Margin or net profit is eighteen dollars a tonne" = 8.241-12.310 s (4.07 s), between two digital-silence pauses of 0.821 s. Replaced by the new take (7.37 s, 30 ms fades at both edges, 40 ms pad), keeping both 0.821 s pauses. The scene is 3.30 s longer (51.40 s).
- The new take's own pauses (0.56 s, 0.50 s) were set to digital silence like the rest of the recording. Original sentence left otherwise untouched.

### Corrections before the common chain
- Level: the take was recorded at about the same raw level as the original (-30.5 LUFS raw vs about -30.2) but with a much higher crest factor. A plosive on "contri-BU-tion" peaked at 0.86 (energy 20-200 Hz), so a local 220 Hz high-pass (4th order, 15 ms crossfade, 1.985-2.105 s) was applied, peak 0.86 to 0.40.
- Spectrum: against the whole recording (long-term speech spectrum, 1/3 octave) the new take was +4 to +6 dB at 80-125 Hz, -4 to -8 dB at 630-1600 Hz, and +5 to +12 dB above 8 kHz (phone mic, closer, brighter). Gentle smoothed EQ (linear phase, 1 octave smoothing): -4.3 dB at 100 Hz, -1.6 dB at 160 Hz, +3.5 dB at 630-1250 Hz, -3 dB at 8 kHz, -9 dB at 12 kHz; no boost above 1.5 kHz. Result against the rest of scene 11: all 1/3-octave band differences within 3 dB, tilt -1.98 dB/oct vs -2.20.
- Noise: the take's floor (quietest 10 % of non-zero 20 ms frames) was -84.8 dBFS raw, i.e. about 14 dB higher than the scene once gained. Pauses gated to digital silence and the common noise reduction applied. After the chain: floor -82.8 dBFS in the new sentence vs -84.5 (before) and -87.8 (after) in the rest of scene 11.
- Gain: +16.2 dB (then the same 5 ms look-ahead limiter at -1.5 dBFS) chosen so that the sentence matches its neighbours.

### Common chain (identical to the table above)
`process()` with noise reduction 0.9 (profile from the file's own quiet frames), then the common +5.82 dB gain and limiter ceiling -2.2 dBFS. The script was checked first by running it on the old original s11: it reproduced the previous `s11.wav` to within 1 LSB. Previous enhanced file kept as `s11-previous.wav`.

### Loudness result (final `s11.wav`)
- Integrated, whole sentence: -15.82 LUFS; neighbours "The line runs at..." -15.72, "Fourteen hours..." -15.26, "Times eighteen dollars..." -16.11 (mean -15.70). Difference -0.12 LU. (Old sentence in the previous file: -15.64.)
- Short-term (3 s): 3 s before -15.76; first 3 s of the sentence -14.79; last 3 s of the sentence -17.44 (the quiet tail "is eighteen dollars", natural fall of the voice, includes a pause); 3 s after -14.66.
- True peak -1.75 dBTP, sample peak -2.2 dBFS (all scenes -1.5 or lower).
- Re-transcription (faster-whisper small.en, 16 kHz): "Contribution margin, the selling price minus the variable cost of each tonne. Is eighteen dollars." Rest of the scene matches the script.

## Word timings and animation sync
- `timing/sXX.json`: word timings for all 15 final WAVs. Each speech island (separated by 0.25 s of digital silence) was transcribed separately (small.en, script as prompt), words that whisper placed after the island end were dropped as hallucinations, the first word of each island is set to the measured sound onset, and other word starts are snapped to a digital-silence onset within 0.25 s or to an energy dip within 0.12 s. Raw whisper times are kept (`s_whisper`). Expected accuracy about 0.1-0.2 s.
- Animation beats now come from `cue-spec.json` (see README); scene durations are the audio length plus 0.5 s.
