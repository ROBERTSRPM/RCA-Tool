"""Clean, cut and enhance the owner's walkthrough voiceover (see ../audio-edit-log.md).
Chain follows the explainer (video/animation/public/audio/edit-log.md): high-pass, gentle noise reduction, light gap expander,
light compressor, ONE common gain to -16 LUFS joined, one look-ahead limiter. De-esser only with --deess.
usage: python process.py <part1-48k.wav> <part2-48k.wav> <outdir> [--deess]"""
import sys, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
import noisereduce as nr
import pyloudnorm as pyln
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
# scene -> list of (part, start, end) source seconds; segments are joined with 0.2 s of silence
CUTS = {
 1: [(1, 2.3, 65.0)],
 2: [(1, 68.1, 124.5)],
 3: [(1, 128.35, 150.0)],
 4: [(1, 153.4, 198.9), (1, 215.3, 233.3)],
 5: [(1, 235.3, 263.4)],
 6: [(1, 274.2, 376.3)],
 7: [(1, 380.4, 424.2)],
 8: [(1, 426.4, 486.9), (1, 499.9, 524.5)],
 9: [(1, 529.0, 566.0)],
 10: [(2, 4.0, 63.8)],
 11: [(2, 79.8, 137.8)],
 12: [(2, 140.9, 160.6)],
 13: [(2, 162.5, 228.5)],
 14: [(2, 231.9, 257.0)],
 15: [(2, 260.1, 288.6), (2, 294.2, 335.0)],
}
LEAD, TAIL = 0.5, 0.8   # room tone before/after every scene (scene 1 gets a longer lead for the sound design)
srcs = {1: sf.read(sys.argv[1], dtype="float64")[0], 2: sf.read(sys.argv[2], dtype="float64")[0]}
out = sys.argv[3]; deess = "--deess" in sys.argv
H = int(0.02 * SR)
dbs, floors = {}, {}
for p, x in srcs.items():
    n = len(x) // H
    dbs[p] = 20 * np.log10(np.array([np.sqrt(np.mean(x[i*H:(i+1)*H] ** 2)) + 1e-9 for i in range(n)]))
    floors[p] = np.percentile(dbs[p], 10)

def snap(p, t, rad=0.12):
    db = dbs[p]; a, b = max(0, int((t - rad) / 0.02)), min(len(db) - 1, int((t + rad) / 0.02))
    return (a + int(np.argmin(db[a:b + 1])) + 0.5) * 0.02

def fade(a, ms=30):
    f = min(int(ms / 1000 * SR), len(a) // 2); a = a.copy(); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a

def shorten(seg_db, seg, thr, maxgap=2.2, keep=1.4):
    """only very long silences (over 2.2 s) are shortened, to 1.4 s: natural pauses are kept"""
    sp = np.convolve((seg_db > thr).astype(int), np.ones(6), "same") > 0
    pieces, last, i, N, log = [], 0, 0, len(sp), []
    while i < N:
        if not sp[i]:
            j = i
            while j < N and not sp[j]: j += 1
            if (j - i) * 0.02 > maxgap and i > 0 and j < N:
                ca, cb = i * H + int(keep / 2 * SR), j * H - int(keep / 2 * SR); pieces.append(seg[last:ca]); last = cb; log.append((i * 0.02, j * 0.02))
            i = j
        else: i += 1
    pieces.append(seg[last:]); return pieces, log

sos = butter(4, 80, "hp", fs=SR, output="sos")
def peaking(f0, gain_db, q):  # RBJ peaking biquad as sos
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q); cw = np.cos(w)
    b = np.array([1 + al * A, -2 * cw, 1 - al * A]); a = np.array([1 + al / A, -2 * cw, 1 - al / A]); return np.hstack([b / a[0], a / a[0]])[None, :]
# gentle match to the explainer's voice (measured long-term spectrum, see audio-edit-log.md): +1.5 dB at 150 Hz, +2 dB at 4 kHz
EQ = np.vstack([peaking(150, 1.5, 0.8), peaking(4000, 2.0, 0.7)])
quiet = {p: np.concatenate([x[i*H:(i+1)*H] for i in range(len(x)//H) if dbs[p][i] <= np.percentile(dbs[p], 12)]) for p, x in srcs.items()}
scenes, report = {}, {}
for sc, cuts in CUTS.items():
    parts, info = [], []
    for (p, a, b) in cuts:
        a2, b2 = snap(p, a), snap(p, b)
        seg = srcs[p][int(a2 * SR):int(b2 * SR)]; sdb = dbs[p][int(a2 / 0.02):int(b2 / 0.02)]
        pcs, lg = shorten(sdb, seg, floors[p] + 12)
        parts.append(fade(np.concatenate(pcs))); info.append({"part": p, "src": [round(a2, 2), round(b2, 2)], "shortened_pauses": [[round(a2 + u, 2), round(a2 + v, 2)] for u, v in lg]})
    body = parts[0]
    for q in parts[1:]: body = np.concatenate([body, np.zeros(int(0.2 * SR)), q])
    p0 = cuts[0][0]
    y = np.concatenate([np.zeros(int((LEAD) * SR)), body, np.zeros(int(TAIL * SR))])
    y = sosfiltfilt(sos, y)
    y = sosfiltfilt(EQ, y)
    y = nr.reduce_noise(y=y, sr=SR, y_noise=quiet[p0], stationary=True, prop_decrease=0.75, n_fft=2048, freq_mask_smooth_hz=400, time_mask_smooth_ms=60)
    # gentle downward expander in the gaps (max 8 dB)
    w = int(0.02 * SR); env = np.sqrt(np.convolve(y ** 2, np.ones(w) / w, "same")) + 1e-9; edb = 20 * np.log10(env)
    thr = floors[p0] + 6
    red = np.clip((thr - edb) * 0.5, 0, 8); g = 10 ** (-red / 20); sm = np.empty_like(g); c = 1.0
    ka, kr = np.exp(-1 / (0.005 * SR)), np.exp(-1 / (0.15 * SR))
    for i in range(len(g)):
        k = ka if g[i] < c else kr; c = k * c + (1 - k) * g[i]; sm[i] = c
    y = y * sm
    # light compressor: threshold -22 dB (relative to this recording's loudness), ratio 2.2:1, 20 ms attack, 200 ms release
    w = int(0.03 * SR); env = np.sqrt(np.convolve(y ** 2, np.ones(w) / w, "same")) + 1e-9; edb = 20 * np.log10(env)
    ref = np.percentile(edb[edb > floors[p0] + 15], 90)  # speech level reference
    over = np.clip(edb - (ref - 8), 0, None) * (1 - 1 / 2.2)
    gc = 10 ** (-over / 20); sm = np.empty_like(gc); c = 1.0
    ka, kr = np.exp(-1 / (0.02 * SR)), np.exp(-1 / (0.2 * SR))
    for i in range(len(gc)):
        k = ka if gc[i] < c else kr; c = k * c + (1 - k) * gc[i]; sm[i] = c
    y = y * sm
    if deess:
        bp = sosfiltfilt(butter(4, [4500, 9500], "bp", fs=SR, output="sos"), y); w5 = int(0.005 * SR)
        benv = np.sqrt(np.convolve(bp ** 2, np.ones(w5) / w5, "same")) + 1e-9; bdb = 20 * np.log10(benv)
        speech = 20 * np.log10(np.sqrt(np.convolve(y ** 2, np.ones(w5) / w5, "same")) + 1e-9) > floors[p0] + 20
        thr_b = np.percentile(bdb[speech], 90); redb = np.clip((bdb - thr_b) * 0.6, 0, 6); gb = 10 ** (-redb / 20); smb = np.empty_like(gb); c = 1.0
        ka, kr = np.exp(-1 / (0.001 * SR)), np.exp(-1 / (0.03 * SR))
        for i in range(len(gb)):
            k = ka if gb[i] < c else kr; c = k * c + (1 - k) * gb[i]; smb[i] = c
        y = y - bp * (1 - smb)
    scenes[sc] = y; report[sc] = {"cuts": info, "seconds": round(len(y) / SR, 2)}

meter = pyln.Meter(SR)
joined = np.concatenate([scenes[k] for k in sorted(scenes)])
l0 = meter.integrated_loudness(joined); gain = 10 ** ((-16.0 - l0) / 20)
def limit(y, ceil=10 ** (-2.2 / 20)):
    la = int(0.005 * SR); need = np.minimum(1.0, ceil / np.maximum(np.abs(y), 1e-9))
    return y * uniform_filter1d(minimum_filter1d(need, 2 * la + 1, mode="nearest"), la, mode="nearest")
for _ in range(4):  # refine the single common gain so the joined result AFTER the limiter is -16.0 LUFS
    lj = meter.integrated_loudness(np.concatenate([limit(scenes[k] * gain) for k in sorted(scenes)]))
    gain *= 10 ** ((-16.0 - lj) / 20)
for sc, y in scenes.items():
    y = limit(y * gain); sf.write(f"{out}/s{sc}.wav", y.astype(np.float32), SR, subtype="PCM_16")
    report[sc]["lufs"] = round(meter.integrated_loudness(y), 1); report[sc]["peak_dbfs"] = round(20 * np.log10(np.abs(y).max()), 2)
report["gain_db"] = round(20 * np.log10(gain), 2); report["joined_lufs_raw"] = round(l0, 1); report["floors_db"] = {k: round(float(v), 1) for k, v in floors.items()}
json.dump(report, open(f"{out}/report.json", "w"), indent=1)
print(json.dumps({k: v for k, v in report.items() if not str(k).isdigit()}), {k: (v["seconds"], v["lufs"]) for k, v in report.items() if str(k).isdigit()})
