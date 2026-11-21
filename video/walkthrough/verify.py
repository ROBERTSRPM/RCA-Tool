"""Automatic cue check. For every highlighted item cue: grab a still from the built scene video at the middle of the highlight window and test
(1) the orange box is really drawn on the rectangle measured from the page's DOM (all four edges),
(2) the box does not cut through anything: no dark text or line runs across the border (dark on both sides of it),
(3) the cursor arrow is on the item (pixel check around the recorded cursor position),
plus the capture-time checks recorded for the element (whole element inside the viewport, cursor inside the element's box).
Writes the table into claims-audit.md between the CUE-CHECK markers and saves the stills (git-ignored) in <work>/stills.
usage: python verify.py <clips dir> <work dir>"""
import sys, os, json, subprocess
import numpy as np
from PIL import Image
clips, work = sys.argv[1], sys.argv[2]
info = json.load(open(os.path.join(work, "build-info.json")))
os.makedirs(os.path.join(work, "stills"), exist_ok=True)
orange = lambda p: p[0] > 200 and 50 < p[1] < 130 and p[2] < 70
rows, bad = [], 0
for sc in info:
    n = int(sc["id"][1:]); vid = os.path.join(work, "vid", f"{sc['id']}.mp4")
    checks = {}
    cf = os.path.join(clips, f"scene{n}.checks.json")
    if os.path.exists(cf): checks = json.load(open(cf))
    phr = {c["mark"]: c for c in sc["cues"]}
    for h in sc.get("highlightsFull", []):
        t = (h["a"] + h["b"]) / 2
        still = os.path.join(work, "stills", f"{sc['id']}_{h['name']}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", vid, "-frames:v", "1", still], check=True)
        im = np.array(Image.open(still).convert("RGB")); H, W = im.shape[:2]; r = h["rect"]
        x0, y0, x1, y1 = r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]
        inframe = x0 >= 0 and y0 >= 0 and x1 <= W and y1 <= H
        def frac(pts, f): return sum(f(im[min(H - 1, max(0, y)), min(W - 1, max(0, x))]) for x, y in pts) / max(1, len(pts))
        edge = [(x, y0 + 2) for x in range(x0 + 8, x1 - 8, 6)] + [(x, y1 - 3) for x in range(x0 + 8, x1 - 8, 6)] + [(x0 + 2, y) for y in range(y0 + 8, y1 - 8, 6)] + [(x1 - 3, y) for y in range(y0 + 8, y1 - 8, 6)]
        boxok = frac(edge, orange) >= 0.9
        # a box cuts text when dark pixels (text or lines) lie on BOTH sides of the border at the same point
        def pairs(o, i):
            pts = [((x, y0 - o), (x, y0 + i)) for x in range(x0 + 8, x1 - 8, 4)] + [((x, y1 + o), (x, y1 - i)) for x in range(x0 + 8, x1 - 8, 4)] + [((x0 - o, y), (x0 + i, y)) for y in range(y0 + 8, y1 - 8, 4)] + [((x1 + o, y), (x1 - i, y)) for y in range(y0 + 8, y1 - 8, 4)]
            isd = lambda q: (lambda p: int(p.mean()) < 110 and not (p[0] > p[1] + 25 and p[0] > p[2] + 40))(im[min(H - 1, max(0, q[1])), min(W - 1, max(0, q[0]))][:3].astype(int))
            return sum(isd(p) and isd(q) for p, q in pts) / max(1, len(pts))
        dark = max(pairs(8, 8), pairs(10, 6))
        cutok = dark < 0.06
        ck = checks.get(h["name"], {})
        cx, cy = ck.get("cursor", [None, None])
        curok = None
        if cx is not None and 0 <= cx < W - 30 and 0 <= cy < H - 30:
            win = im[cy:cy + 26, cx:cx + 20].astype(int); curok = int(((win.sum(axis=2) < 150)).sum()) >= 25
        cap = ck.get("fullyVisible") and ck.get("rectInFrame") and ck.get("cursorOnElement")
        ok = bool(inframe and boxok and cutok and cap and (curok is not False))
        bad += (not ok)
        c = phr.get(h["name"], {})
        rows.append(f"| {sc['id']} | {h['name']} | {c.get('phrase') or '-'} | {c.get('at', '-')} | {h['a']:.1f} to {h['b']:.1f} | {'yes' if ck.get('fullyVisible') else 'NO'} | {'yes' if ck.get('cursorOnElement') else 'NO'} | {'yes' if boxok else 'NO'} | {'yes' if cutok else 'NO (%.0f%% dark)' % (dark * 100)} | {'yes' if curok else ('NO' if curok is False else 'n/a')} | {'PASS' if ok else 'FAIL'} |")
hdr = "| Scene | Item | Spoken phrase | Cue at (s) | Box on (s) | Whole element on screen | Cursor on element | Box drawn on its DOM rectangle | Nothing cut by the box | Cursor arrow in still | Result |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
table = f"<!-- CUE-CHECK-START -->\n## Automatic cue check (still at the middle of each highlight)\n{len(rows)} highlighted item cues, {len(rows) - bad} pass, {bad} fail. Stills are in the work folder (not committed).\n\n" + hdr + "\n".join(rows) + "\n<!-- CUE-CHECK-END -->\n"
audit = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claims-audit.md"); a = open(audit).read()
if "<!-- CUE-CHECK-START -->" in a: a = a[:a.index("<!-- CUE-CHECK-START -->")] + table + a[a.index("<!-- CUE-CHECK-END -->") + len("<!-- CUE-CHECK-END -->\n"):]
else: a = a.rstrip() + "\n\n" + table
open(audit, "w").write(a); print(len(rows), "cues,", bad, "fail")
