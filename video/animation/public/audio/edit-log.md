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
