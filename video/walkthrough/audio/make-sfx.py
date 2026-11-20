"""Generated, low-level sound for walkthrough scene 1 only (no samples, no music). usage: python make-sfx.py <out.wav> [scene1 seconds]
Cues follow script.md: tray-sealer hum and thump (0 to 28 s), leak-tester bubbling (13.5 to 19 s), two phone rings (29.4 s, 34.0 s),
a faint room tone in the meeting room, then silence on the final question. Replace or add real sound by dropping files into the
stems folder (see ../audio-edit-log.md, 'Where a licensed track or SFX goes')."""
import sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
SR = 48000; rng = np.random.default_rng(7)
dur = float(sys.argv[2]) if len(sys.argv) > 2 else 63.86
n = int(dur * SR); t = np.arange(n) / SR
def env(a, b, f=0.6):
    return np.clip(np.minimum((t - a) / f, (b - t) / f), 0, 1)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "bp", fs=SR, output="sos"), x)
def lp(x, fc): return sosfilt(butter(2, fc, "lp", fs=SR, output="sos"), x)
out = np.zeros(n)
# 1. tray sealer: low hum + fan noise + rhythmic thump + occasional tray clink
hum = 0.5 * np.sin(2 * np.pi * 98 * t) + 0.3 * np.sin(2 * np.pi * 196 * t + 0.4) + 0.12 * np.sin(2 * np.pi * 294 * t)
hum *= 1 + 0.08 * np.sin(2 * np.pi * 0.35 * t)
fan = lp(rng.standard_normal(n), 900) * 0.5
mach = (hum * 0.55 + fan * 0.35) * env(0.0, 28.4, 1.2)
thump = np.zeros(n)
for k in np.arange(0.9, 28.0, 1.1):
    i = int(k * SR); m = min(int(0.25 * SR), n - i); tt = np.arange(m) / SR
    thump[i:i + m] += (np.sin(2 * np.pi * 62 * tt) * np.exp(-tt * 22) * 0.9 + lp(rng.standard_normal(m), 600) * np.exp(-tt * 40) * 0.5)
out += mach * 0.05 + thump * 0.06 * env(0.0, 28.4, 1.0)
for k in rng.uniform(2.0, 27.0, 9):
    i = int(k * SR); m = int(0.18 * SR); tt = np.arange(m) / SR
    out[i:i + m] += 0.012 * np.sin(2 * np.pi * rng.choice([2400, 3100, 3800]) * tt) * np.exp(-tt * 28)
# 2. leak tester bubbling under the second line
bub = np.zeros(n)
for k in np.sort(rng.uniform(13.5, 19.0, 90)):
    i = int(k * SR); m = int(0.03 * SR); tt = np.arange(m) / SR; f0 = rng.uniform(500, 1100)
    bub[i:i + m] += np.sin(2 * np.pi * (f0 + 3000 * tt) * tt) * np.exp(-tt * 110)
out += bub * 0.02 * env(13.5, 19.2, 0.8)
# 3. night: very quiet room tone, phone rings
room = lp(rng.standard_normal(n), 300) * 0.03
out += room * (env(28.2, 36.6, 0.8) * 0.6 + env(44.8, 54.0, 1.0) * 0.8)
def ring(start, f1, f2, count=2, on=0.42, off=0.2, amp=0.05):
    r = np.zeros(n)
    for c in range(count):
        a = start + c * (on + off); i = int(a * SR); m = int(on * SR)
        if i + m >= n: continue
        tt = np.arange(m) / SR
        tone = (np.sin(2 * np.pi * f1 * tt) + np.sin(2 * np.pi * f2 * tt)) * (0.6 + 0.4 * np.sin(2 * np.pi * 20 * tt))
        r[i:i + m] += tone * np.minimum(np.minimum(tt / 0.01, (on - tt) / 0.02), 1)
    return r * amp
out += ring(29.4, 440, 480, count=3) + ring(34.0, 523, 659, count=3)
out[int(54.4 * SR):] = 0.0                                   # cut all sound on the final question, then silence
out *= 1.0
peak = np.abs(out).max(); print("sfx peak dBFS", round(20 * np.log10(peak), 1))
sf.write(sys.argv[1], out.astype(np.float32), SR, subtype="PCM_16")
