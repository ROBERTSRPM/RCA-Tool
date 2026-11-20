"""Generated sound for the walkthrough: sfx.wav and music.wav (both mono 48 kHz, full length). Everything is synthesised here from
noise and sine waves, so there is no sample, loop or library track and nothing to license (see ../audio-edit-log.md).
usage: python make-sound.py <report.json> <voice.wav> <out dir>
Both stems are ducked under the voice (speech-driven envelope) so they never mask speech. Cues follow script.md [SFX]/[MUSIC]:
scene 1 plant ambience, sealer and conveyor, leak tester, hold tags, two phones, silence on the final question; scene 2 soft ticks
as the four aims and the figures appear; scene 13 a soft chime at the verified saving; the end card; a quiet calm bed under scenes 2 to 15."""
import sys, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, sosfiltfilt
from scipy.ndimage import uniform_filter1d
SR = 48000
rep = json.load(open(sys.argv[1])); voice, vsr = sf.read(sys.argv[2], dtype="float64"); assert vsr == SR
out = sys.argv[3]
starts, t0 = {}, 0.0
for k in range(1, 16): starts[k] = t0; t0 += rep[str(k)]["seconds"]
TOTAL = t0; n = int(TOTAL * SR); rng = np.random.default_rng(11); T = np.arange(n) / SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "bp", fs=SR, output="sos"), x)
def lp(x, fc, o=2): return sosfilt(butter(o, fc, "lp", fs=SR, output="sos"), x)
def hp(x, fc, o=2): return sosfilt(butter(o, fc, "hp", fs=SR, output="sos"), x)
def env(a, b, f=0.8): return np.clip(np.minimum((T - a) / f, (b - T) / f), 0, 1)
def put(buf, at, sig, amp=1.0):
    i = int(at * SR)
    if i < 0 or i >= n: return
    m = min(len(sig), n - i); buf[i:i + m] += sig[:m] * amp
voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
# speech activity -> duck envelope (fast attack, slow release)
w = int(0.03 * SR); venv = np.sqrt(uniform_filter1d(voice ** 2, w)) + 1e-9
act = (20 * np.log10(venv) > -45).astype(float)
act = uniform_filter1d(act, int(0.25 * SR)); act = np.clip(act * 1.6, 0, 1)
from scipy.ndimage import maximum_filter1d
duck = uniform_filter1d(maximum_filter1d(act, int(0.25 * SR)), int(0.45 * SR)); duck = np.clip(duck, 0, 1)
def ducked(x, db): return x * (1 - duck * (1 - 10 ** (-db / 20)))
S1 = starts[1]
# ---------- SFX ----------
sfx = np.zeros(n)
# 1. night-shift plant ambience: 50 Hz mains hum and harmonics, low rumble, ventilation hiss (0 to 28.4 s)
amb = (0.6 * np.sin(2 * np.pi * 50 * T) + 0.35 * np.sin(2 * np.pi * 100 * T + 0.7) + 0.2 * np.sin(2 * np.pi * 150 * T + 1.3)) * (1 + 0.06 * np.sin(2 * np.pi * 0.27 * T))
amb += lp(rng.standard_normal(n), 220) * 1.6 + bp(rng.standard_normal(n), 2000, 6000) * 0.05
sfx += amb * 0.05 * env(0.0, 28.6, 1.5)
# conveyor: soft rolling rattle every 0.5 s and a belt hush
conv = bp(rng.standard_normal(n), 400, 1800) * 0.03
for k in np.arange(0.3, 28.4, 0.5):
    m = int(0.05 * SR); tt = np.arange(m) / SR; put(sfx, k, bp(rng.standard_normal(m), 600, 3000) * np.exp(-tt * 70), 0.035 * rng.uniform(0.6, 1.0))
sfx += conv * env(0.0, 28.6, 1.5) * 0.7
# tray sealer cycle: pneumatic thunk and release hiss every 1.1 s; occasional tray clink
for k in np.arange(0.9, 28.2, 1.1):
    m = int(0.35 * SR); tt = np.arange(m) / SR
    thunk = np.sin(2 * np.pi * 58 * tt) * np.exp(-tt * 20) + lp(rng.standard_normal(m), 500) * np.exp(-tt * 38) * 0.6
    hiss = bp(rng.standard_normal(m), 3000, 9000) * np.exp(-(tt - 0.05).clip(0) * 14) * (tt > 0.05) * 0.12
    put(sfx, k, thunk + hiss, 0.08)
for k in rng.uniform(2.0, 27.0, 8):
    m = int(0.2 * SR); tt = np.arange(m) / SR; f0 = rng.choice([2300, 3000, 3700])
    put(sfx, k, (np.sin(2 * np.pi * f0 * tt) + 0.5 * np.sin(2 * np.pi * f0 * 1.52 * tt)) * np.exp(-tt * 30), 0.012)
# the operator sets three packs on the table (10.1 to 11 s)
for k in (10.15, 10.55, 10.9):
    m = int(0.18 * SR); tt = np.arange(m) / SR; put(sfx, k, lp(rng.standard_normal(m), 900) * np.exp(-tt * 38) + np.sin(2 * np.pi * 140 * tt) * np.exp(-tt * 30), 0.07)
# 2. leak tester: splash as the pack goes in (13.7 s), then bubbling under the second line (15.6 to 19.4 s)
m = int(0.6 * SR); tt = np.arange(m) / SR; put(sfx, 13.75, bp(rng.standard_normal(m), 700, 3500) * np.exp(-tt * 9) * (1 - np.exp(-tt * 120)), 0.12)
for k in np.sort(rng.uniform(14.2, 19.4, 150)):
    m = int(0.04 * SR); tt = np.arange(m) / SR; f0 = rng.uniform(400, 1000)
    put(sfx, k, np.sin(2 * np.pi * (f0 + 2500 * tt) * tt) * np.exp(-tt * 90), 0.03 * min(1, (k - 14.2) / 1.5 + 0.2))
sfx += bp(rng.standard_normal(n), 300, 1500) * 0.012 * env(14.0, 19.6, 0.8)
# 3. hold tags slapped on the pallets (visual: 20.5, 21.7, 22.9 s)
for k in (20.5, 21.7, 22.9):
    m = int(0.25 * SR); tt = np.arange(m) / SR; put(sfx, k, hp(rng.standard_normal(m), 900) * np.exp(-tt * 45) + np.sin(2 * np.pi * 220 * tt) * np.exp(-tt * 40) * 0.5, 0.08)
# 4. night: bedside room tone, two phones (vibration buzz plus ringtone), then the meeting room (28.2 to 54.0 s)
room = lp(rng.standard_normal(n), 260) * 0.05
sfx += room * (env(28.2, 36.8, 0.8) * 0.6 + env(44.8, 54.0, 1.0) * 0.8)
def ring(at, notes, rep=3, step=0.16, gap=0.9, amp=0.05):
    for r in range(rep):
        for j, f in enumerate(notes):
            m = int(0.5 * SR); tt = np.arange(m) / SR
            tone = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 7) * np.minimum(tt / 0.004, 1)
            put(sfx, at + r * (len(notes) * step + gap) + j * step, tone, amp)
def buzz(at, rep=3, gap=1.05):
    for r in range(rep):
        a = at + r * gap; m = int(0.42 * SR); tt = np.arange(m) / SR
        put(sfx, a, np.sin(2 * np.pi * 170 * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * tt)) * np.minimum(np.minimum(tt / 0.01, (0.42 - tt) / 0.03), 1) + bp(rng.standard_normal(m), 150, 600) * 0.2, 0.08)
ring(29.4, [880, 660, 880, 660], rep=2, amp=0.09); buzz(29.4, rep=3)
ring(34.0, [523, 659, 784], rep=2, amp=0.09); buzz(34.0, rep=3)
# 5. slack pack and the count of events (37 to 43 s): six soft taps, the sixth lower
for i in range(6):
    m = int(0.2 * SR); tt = np.arange(m) / SR; f = 760 if i < 5 else 420
    put(sfx, 37.3 + i * 1.0, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 22) * 0.9 + lp(rng.standard_normal(m), 3000) * np.exp(-tt * 60) * 0.3, 0.05)
# sound off on the final question (from 54.4 s)
sfx *= np.where(T - S1 < 54.4, 1.0, 0.0) * (T < starts[2]) + (T >= starts[2])
# scene 2: a soft tick as each aim and each figure appears (times from the edited voice, see words.json)
tick = lambda at, f=1250, a=0.05: put(sfx, starts[2] + at, np.sin(2 * np.pi * f * np.arange(int(0.25 * SR)) / SR) * np.exp(-np.arange(int(0.25 * SR)) / SR * 26) * (1 + 0.4 * np.sin(2 * np.pi * 3 * f * np.arange(int(0.25 * SR)) / SR) * 0), a)
for at in (3.7, 9.0, 13.9, 18.2): tick(at, 1250)
for at in (34.0, 36.2, 40.6, 44.2, 50.0): tick(at, 980, 0.04)
# scene 13: a soft two-note chime as the verified saving appears
chime = lambda at, f, a: put(sfx, at, (np.sin(2 * np.pi * f * np.arange(int(1.6 * SR)) / SR) + 0.25 * np.sin(2 * np.pi * 2 * f * np.arange(int(1.6 * SR)) / SR)) * np.exp(-np.arange(int(1.6 * SR)) / SR * 3.2) * np.minimum(np.arange(int(1.6 * SR)) / SR / 0.01, 1), a)
chime(starts[13] + 35.4, 659, 0.035); chime(starts[13] + 35.75, 880, 0.035)
# end card: one soft low tone
endc = starts[15] + rep["15"]["seconds"] - 4.8
chime(endc, 392, 0.04)
# duck the SFX under speech (never over a spoken word): ambience and rings lightly, other SFX more
sfx_d = ducked(sfx, 7)
# ---------- music ----------
def pad(freqs, dur, amp):
    m = int(dur * SR); tt = np.arange(m) / SR; sig = np.zeros(m)
    for f in freqs:
        for det, g in ((0.997, 1.0), (1.003, 1.0), (1.0, 0.7)):
            sig += g * (np.sin(2 * np.pi * f * det * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * det * tt + 0.5) + 0.08 * np.sin(2 * np.pi * 3 * f * det * tt))
    sig = lp(sig, 1800) / (len(freqs) * 2.4)
    return sig * np.minimum(np.minimum(tt / 2.5, (dur - tt) / 2.5), 1) * amp
def pluck(f, dur=1.8):
    m = int(dur * SR); tt = np.arange(m) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 2.4) * np.minimum(tt / 0.01, 1)
CH = [([220.0, 277.18, 329.63, 415.30], [440.0, 554.37, 659.26, 830.6]), ([185.0, 220.0, 277.18, 369.99], [369.99, 440, 554.37, 739.99]), ([146.83, 220.0, 293.66, 369.99], [293.66, 440, 587.33, 739.99]), ([164.81, 207.65, 246.94, 329.63], [329.63, 415.3, 493.88, 659.26])]  # Amaj7, F#m7, D, Esus-ish: a slow, plain loop
music = np.zeros(n)
def bed(a, b, amp, plucks=True):
    t = a; i = 0
    while t < b - 1.0:
        notes, up = CH[i % 4]; d = min(8.0, b - t + 2.0)
        put(music, t, pad(notes, d, amp), 1.0)
        if plucks:
            for j, f in enumerate(up): put(music, t + 1.0 + j * 1.5, pluck(f), amp * 0.5)
        t += 8.0 - 1.5; i += 1
# scene 1: low tense drone from 3 s, gone by the last question; scenes 2 to 15: the calm bed, a soft pulse in scene 6, calm bed back under the end card
drone = (np.sin(2 * np.pi * 55 * T) + 0.5 * np.sin(2 * np.pi * 82.4 * T) * (1 + 0.3 * np.sin(2 * np.pi * 0.2 * T)) + 0.2 * np.sin(2 * np.pi * 110.4 * T)) * env(S1 + 3.0, S1 + 54.0, 5.0)
music += lp(drone, 400) * 0.05
bed(starts[2], TOTAL, 0.05)
pulse_a, pulse_b = starts[6] + 55.0, starts[6] + 100.0
for k in np.arange(pulse_a, pulse_b, 1.0):
    m = int(0.5 * SR); tt = np.arange(m) / SR; put(music, k, np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 7) * 0.5, 0.045 * min(1, (k - pulse_a) / 10 + 0.3))
music *= np.minimum(1.0, np.maximum(0.0, (TOTAL - T) / 4.0))        # fade out under the end card
music_d = ducked(music, 14)
# overall stem levels: measure and set so the music sits well under the voice (about -34 LUFS alone, ducked further under speech)
import pyloudnorm as pyln
m_ = pyln.Meter(SR)
def settle(x, target):
    try: l = m_.integrated_loudness(x)
    except Exception: return x
    return x * 10 ** ((target - l) / 20)
music_d = settle(music_d, -36.0); sfx_d = sfx_d * 1.0
for name, x in (("sfx", sfx_d), ("music", music_d)):
    pk = np.abs(x).max(); print(name, "peak dBFS", round(20 * np.log10(pk + 1e-9), 1), "LUFS", round(m_.integrated_loudness(x), 1))
    sf.write(f"{out}/{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
