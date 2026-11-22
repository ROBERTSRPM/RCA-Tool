"""Before/after tone report for the re-recorded sections. usage: python tone-report.py <audio dir (processed scenes + words.json)> <part1 48k wav> <part2 48k wav>"""
import sys, json, numpy as np, soundfile as sf, subprocess, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import tone
ad, p1, p2 = sys.argv[1:4]; SR = 48000; R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recordings")
words = json.load(open(ad + "/words.json"))
def span(n, first, last):
    ws = words[str(n)]; t = [w[0].lower().strip(".,") for w in ws]; f = first.lower().split(); l = last.lower().split()
    for i in range(len(t)):
        if t[i:i + len(f)] == f:
            for j in range(i, len(t)):
                if t[j:j + len(l)] == l: return ws[i][1], ws[j + len(l) - 1][2]
    raise SystemExit(f"not found {n} {first}")
def raw(f):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f, "-ac", "1", "-ar", "48000", "/tmp/_r.wav"], check=True); return sf.read("/tmp/_r.wav")[0]
ref = tone.measure(np.concatenate([sf.read(p1)[0][3 * SR:], sf.read(p2)[0][100 * SR:200 * SR]]))
secs = [("scene 1 phones line (take 2, PC mic)", "scene1-line-phones-take2-original.m4a", 1, 28.4, 35.5),
        ("scene 10 re-record 1, line a", "scene10-rerecord-original.m4a", 10, 27.9, 35.6),
        ("scene 10 re-record 1, line b", "scene10-rerecord-original.m4a", 10, 53.7, 57.0),
        ("scene 11 re-record 2, preventive", "rerecord-2-original.m4a", 11, 20.3, 23.0),
        ("scene 15 re-record 2, Thursday", "rerecord-2-original.m4a", 15, 0.0, 5.1)]
def row(nm, m): g = tone.band_groups(m["spec"]); return m, g
gr = tone.band_groups(ref["spec"])
# the "after" rows are in the finished scene audio, which has also been through the common chain (EQ, noise reduction, compressor, level), so they are compared with the finished main-voice scenes
fin = np.concatenate([sf.read(f"{ad}/s{n}.wav")[0] for n in (4, 6, 8, 9, 13)]); refa = tone.measure(fin); gra = tone.band_groups(refa["spec"])
print(f"{'section':40s} {'when':7s} {'speech':>7s} {'floor':>7s} {'SNR':>6s} {'decay':>6s} {'low':>6s} {'mid':>6s} {'pres':>6s} {'air':>6s} {'rms-dev':>7s}")
def line(nm, when, m, r, gr_):
    g = tone.band_groups(m["spec"]); d = np.sqrt(np.mean((m["spec"] - r["spec"]) ** 2))
    print(f"{nm:40s} {when:7s} {m['speech_db']:7.1f} {m['floor_db']:7.1f} {m['snr_db']:6.1f} {m['decay_db_120ms']:6.1f} " + " ".join(f"{g[k]-gr_[k]:+6.1f}" for k in g) + f" {d:7.1f}")
line("main recordings, raw (reference)", "-", ref, ref, gr); line("main recordings, finished scenes (ref)", "-", refa, refa, gra)
for nm, f, n, t0, t1 in secs:
    y = sf.read(f"{ad}/s{n}.wav")[0]
    line(nm, "before", tone.measure(raw(os.path.join(R, f))), ref, gr)
    line("", "after", tone.measure(y[int(max(0, t0 - 0.3) * SR):int((t1 + 0.6) * SR)]), refa, gra)
