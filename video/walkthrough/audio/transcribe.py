"""Whisper word times for each edited scene file (words.json). usage: python transcribe.py <dir with s1.wav..s15.wav>"""
import sys, json, soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8"); res = {}
for i in range(1, 16):
    x, sr = sf.read(f"{sys.argv[1]}/s{i}.wav", dtype="float32"); x16 = resample_poly(x, 1, 3).astype("float32")
    segs, _ = m.transcribe(x16, word_timestamps=True, initial_prompt="RCA Pilot, Line 3, tray sealer, leak tester, NCR-2291, Cause coach, Challenge my analysis, www.rcapilot.com.", condition_on_previous_text=False)
    res[i] = [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
json.dump(res, open(sys.argv[1] + "/words.json", "w")); print("words.json written")
