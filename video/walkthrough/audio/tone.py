"""Measures a recording's tone: long-term speech spectrum in 1/3-octave bands (relative to its own 200 Hz to 4 kHz average), noise floor, SNR and a room-decay figure.
usage as module: measure(wav_48k_mono) -> dict. Used by process.py to build the match EQ and by the report in audio-edit-log.md."""
import numpy as np, soundfile as sf
from scipy.signal import welch
SR = 48000
BANDS = [100 * 2 ** (k / 3) for k in range(0, 21)]  # 100 Hz ... about 10 kHz, 1/3 octave centres
def speech_mask(y, hop=0.02):
    h = int(hop * SR); e = np.array([20 * np.log10(np.sqrt(np.mean(y[i:i + h] ** 2)) + 1e-9) for i in range(0, len(y) - h, h)])
    return e, h, e > np.percentile(e, 95) - 15
def spectrum(y):
    e, h, m = speech_mask(y)
    fr = np.concatenate([y[i * h:(i + 1) * h * 1] for i in range(len(m)) if m[i]]) if m.any() else y
    f, p = welch(fr, SR, nperseg=4096)
    out = []
    for c in BANDS:
        lo, hi = c / 2 ** (1 / 6), c * 2 ** (1 / 6); out.append(10 * np.log10(np.mean(p[(f >= lo) & (f < hi)]) + 1e-20))
    out = np.array(out); ref = np.mean(out[[i for i, c in enumerate(BANDS) if 200 <= c <= 4000]])
    return out - ref
def measure(y):
    e, h, m = speech_mask(y)
    sp = np.median(e[m]); nf = np.percentile(e, 10)
    # room decay: after a speech frame run ends, how many dB the level falls in the next 120 ms (drier room falls faster)
    drops = []
    for i in range(3, len(e) - 8):
        if m[i - 1] and m[i - 2] and not m[i] and not m[i + 1]:
            drops.append(e[i - 1] - np.min(e[i:i + 6]))
    return {"speech_db": float(sp), "floor_db": float(nf), "snr_db": float(sp - nf), "decay_db_120ms": float(np.median(drops)) if drops else float("nan"), "spec": spectrum(y)}
def band_groups(s):
    g = lambda lo, hi: float(np.mean([s[i] for i, c in enumerate(BANDS) if lo <= c < hi]))
    return {"low 100-300": g(100, 300), "mid 300-2k": g(300, 2000), "presence 2-6k": g(2000, 6000), "air 6-10k": g(6000, 11000)}
