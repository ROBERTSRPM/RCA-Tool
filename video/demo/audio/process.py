"""Clean, cut and enhance the owner's demo voiceover (see ../audio-edit-log.md).
Usage: python process.py <orig48.wav> <outdir>
Cut points are source-recording seconds, snapped to the quietest 20 ms frame within +-0.12 s (or the
window given), so no cut falls inside a word."""
import sys, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
import noisereduce as nr

SR = 48000
# scene -> list of (start, end) source segments, joined with 0.18 s of silence
CUTS = {
 1: [(3.15, 22.45)],
 2: [(25.05, 55.30)],
 3: [(58.90, 73.50)],
 4: [(76.50, 95.76), (106.80, 111.50), (112.40, 121.40)],
 5: [(127.35, 153.80)],
 6: [(155.30, 173.80)],
 7: [(176.65, 188.60)],
 8: [(193.30, 208.00)],
}
# explicit snap windows for cuts that sit next to speech (start/end search ranges, source seconds)
x, sr = sf.read(sys.argv[1], dtype="float64")
assert sr == SR
out = sys.argv[2]
H = int(0.02 * SR); n = len(x) // H
db = 20 * np.log10(np.array([np.sqrt(np.mean(x[i*H:(i+1)*H] ** 2)) + 1e-9 for i in range(n)]))
floor = np.percentile(db, 10)
speech_thr = floor + 12

def snap(t, rad=0.12):
    a, b = max(0, int((t - rad) / 0.02)), min(n - 1, int((t + rad) / 0.02))
    i = a + int(np.argmin(db[a:b + 1])); return (i + 0.5) * 0.02

def shorten(seg_db, seg, maxgap=1.3, keep=1.0):
    """Shorten silent runs longer than maxgap to `keep` seconds (cut in the middle of the run)."""
    sp = seg_db > speech_thr
    # smooth: a 0.12 s hole inside speech is not a pause
    k = 6; sp = np.convolve(sp.astype(int), np.ones(k), "same") > 0
    res, i, N = [], 0, len(sp); pieces = []; last = 0; log = []
    while i < N:
        if not sp[i]:
            j = i
            while j < N and not sp[j]: j += 1
            if (j - i) * 0.02 > maxgap and i > 0 and j < N:
                cut_a = i * H + int((keep / 2) * SR); cut_b = j * H - int((keep / 2) * SR)
                pieces.append(seg[last:cut_a]); last = cut_b; log.append(((i * 0.02), (j * 0.02)))
            i = j
        else: i += 1
    pieces.append(seg[last:])
    return pieces, log

def fade(a, ms=30):
    f = int(ms / 1000 * SR); a = a.copy(); f = min(f, len(a) // 2)
    a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a

sos = butter(4, 80, "hp", fs=SR, output="sos")
report = {}
# noise profile: the quietest 10 % of 20 ms frames of the whole recording
quiet = np.concatenate([x[i*H:(i+1)*H] for i in range(n) if db[i] <= np.percentile(db, 12)])
scenes = {}
for sc, cuts in CUTS.items():
    parts, info = [], []
    for (a, b) in cuts:
        a2, b2 = snap(a), snap(b)
        seg = x[int(a2 * SR):int(b2 * SR)]
        sdb = db[int(a2 / 0.02):int(b2 / 0.02)]
        pcs, lg = shorten(sdb, seg)
        parts.append(fade(np.concatenate(pcs))); info.append({"src": [round(a2, 2), round(b2, 2)], "shortened_pauses": [[round(a2 + p, 2), round(a2 + q, 2)] for p, q in lg]})
    gap = np.zeros(int(0.18 * SR))
    body = parts[0]
    for p in parts[1:]: body = np.concatenate([body, gap, p])
    y = np.concatenate([np.zeros(int(0.25 * SR)), body, np.zeros(int(0.45 * SR))])
    y = sosfiltfilt(sos, y)
    y = nr.reduce_noise(y=y, sr=SR, y_noise=quiet, stationary=True, prop_decrease=0.85, n_fft=2048, freq_mask_smooth_hz=400, time_mask_smooth_ms=60)
    # downward expander in the gaps
    env = np.sqrt(np.convolve(y ** 2, np.ones(int(0.02 * SR)) / int(0.02 * SR), "same")) + 1e-9
    edb = 20 * np.log10(env)
    red = np.clip((speech_thr - 6 - edb) * 0.6, 0, 12)  # up to 12 dB down below threshold
    # smooth the gain (fast attack, slow release)
    g = 10 ** (-red / 20); sm = np.empty_like(g); c = 1.0
    ka, kr = np.exp(-1 / (0.005 * SR)), np.exp(-1 / (0.15 * SR))
    for i in range(len(g)):
        c = (ka if g[i] < c else kr) * c + (1 - (ka if g[i] < c else kr)) * g[i]; sm[i] = c
    y = y * sm
    # light compressor (-22 dB, 2.2:1) via smoothed envelope
    env = np.sqrt(np.convolve(y ** 2, np.ones(int(0.03 * SR)) / int(0.03 * SR), "same")) + 1e-9
    edb = 20 * np.log10(env); over = np.clip(edb + 22, 0, None) * (1 - 1 / 2.2)
    gc = 10 ** (-over / 20); sm = np.empty_like(gc); c = 1.0
    ka, kr = np.exp(-1 / (0.02 * SR)), np.exp(-1 / (0.2 * SR))
    for i in range(len(gc)):
        k = ka if gc[i] < c else kr; c = k * c + (1 - k) * gc[i]; sm[i] = c
    y = y * sm
    # de-esser: attenuate the 4.5 to 9.5 kHz band only while it is strong (harsh 's' sounds on the phone mic)
    bp = sosfiltfilt(butter(4, [4500, 9500], "bp", fs=SR, output="sos"), y)
    w5 = int(0.005 * SR); benv = np.sqrt(np.convolve(bp ** 2, np.ones(w5) / w5, "same")) + 1e-9
    bdb = 20 * np.log10(benv); spk = bdb[(20 * np.log10(np.sqrt(np.convolve(y ** 2, np.ones(w5) / w5, "same")) + 1e-9)) > -45]
    thr_b = np.percentile(spk, 85)
    redb = np.clip((bdb - thr_b) * 0.8, 0, 10); gb = 10 ** (-redb / 20); smb = np.empty_like(gb); c = 1.0
    ka, kr = np.exp(-1 / (0.001 * SR)), np.exp(-1 / (0.03 * SR))
    for i in range(len(gb)):
        k = ka if gb[i] < c else kr; c = k * c + (1 - k) * gb[i]; smb[i] = c
    y = y - bp * (1 - smb)
    report.setdefault("deess_thr_db", {})[sc] = round(float(thr_b), 1)
    scenes[sc] = y; report[sc] = {"cuts": info, "seconds": round(len(y) / SR, 2)}
# one common gain so the joined scenes reach about -16 LUFS, then 5 ms look-ahead limiter at -2.2 dBFS
import pyloudnorm as pyln
joined = np.concatenate([scenes[k] for k in sorted(scenes)])
meter = pyln.Meter(SR); l0 = meter.integrated_loudness(joined); gain = 10 ** ((-16.0 - l0) / 20)
def limit(y, ceil=10 ** (-2.2 / 20)):
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    la = int(0.005 * SR)
    need = np.minimum(1.0, ceil / np.maximum(np.abs(y), 1e-9))
    g = uniform_filter1d(minimum_filter1d(need, 2 * la + 1, mode="nearest"), la, mode="nearest")
    return y * np.minimum(g, need) if False else y * g
for sc, y in scenes.items():
    y = limit(y * gain); sf.write(f"{out}/s{sc}.wav", y.astype(np.float32), SR, subtype="PCM_16")
    report[sc]["lufs"] = round(meter.integrated_loudness(y), 1); report[sc]["peak_dbfs"] = round(20 * np.log10(np.abs(y).max()), 2)
report["gain_db"] = round(20 * np.log10(gain), 2); report["floor_db"] = round(float(floor), 1); report["joined_lufs_before_gain"] = round(l0, 1)
json.dump(report, open(f"{out}/report.json", "w"), indent=1)
print(json.dumps(report, indent=1))
