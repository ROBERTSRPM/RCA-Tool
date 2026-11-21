// Capture context: records frame by frame when a Recorder is on, otherwise replays instantly ("fast" mode) to rebuild state.
import fs from "node:fs";
import path from "node:path";
import { Recorder, H } from "./lib.mjs";

export class Ctx {
  constructor(page, S) { this.page = page; this.S = S; this.r = null; }
  get rec() { return !!(this.r && this.r.on); }
  startRecording(n) { this.r = new Recorder(this.page, path.join(this.S, "wframes"), `w${n}`); this.r.start(); }
  stopRecording() { if (this.r) this.r.stop(); }
  mark(l) { if (this.rec) this.r.mark(l); }
  // bring the element into a readable band of the viewport (clear of the sticky header and the caption area), smoothly when recording.
  // fill = true for fields being typed into: the whole box must sit in the upper part so the typed text is clearly visible.
  async ensureVisible(loc, fill = false) {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox(); if (!b) return;
    const lo = fill ? 190 : 150, hi = fill ? H - 230 : H - 130;
    if (b.y < lo || b.y + Math.min(b.height, 260) > hi) {
      const dy = b.y - (fill ? 250 : 330);
      if (this.rec) await this.r.scroll(dy, 0.7); else await this.page.evaluate((d) => window.scrollBy(0, d), dy);
    }
  }
  // remember a screen rectangle (1920x1080 px) of an element for the highlight overlay; valid while the page is not scrolled
  async rect(name, loc, pad = 10, grow = {}) {
    if (!this.rec) return;
    const b = await loc.boundingBox(); if (!b) return;
    const k = 1920 / 1440; this.rects = this.rects ?? {};
    this.rects[name] = { x: Math.round((b.x - pad) * k), y: Math.round((b.y - pad) * k), w: Math.round((b.width + 2 * pad + (grow.w ?? 0)) * k), h: Math.round((b.height + 2 * pad + (grow.h ?? 0)) * k) };
  }
  // rectangle from a label's box: offsets and size in CSS px (for stat tiles and rows whose container has no stable selector)
  async rectBox(name, loc, dx, dy, w, h) {
    if (!this.rec) return;
    const b = await loc.boundingBox(); if (!b) return;
    const k = 1920 / 1440; this.rects = this.rects ?? {};
    this.rects[name] = { x: Math.round((b.x + dx) * k), y: Math.round((b.y + dy) * k), w: Math.round(w * k), h: Math.round(h * k) };
  }
  async rectUnion(name, locs, pad = 10) {
    if (!this.rec) return;
    const bs = []; for (const l of locs) { const b = await l.boundingBox(); if (b) bs.push(b); } if (!bs.length) return;
    const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.width)), y1 = Math.max(...bs.map((b) => b.y + b.height));
    const k = 1920 / 1440; this.rects = this.rects ?? {};
    this.rects[name] = { x: Math.round((x0 - pad) * k), y: Math.round((y0 - pad) * k), w: Math.round((x1 - x0 + 2 * pad) * k), h: Math.round((y1 - y0 + 2 * pad) * k) };
  }
  // ---- item beats: the cursor goes to the named element, the whole element is on screen, and its real DOM box is recorded for the highlight ----
  // kind: self (the element), tile (its stat-tile ancestor), row (its calculation-row ancestor), wide (its wide card ancestor)
  async domBox(loc, kind = "self") {
    return await loc.evaluate((el, kind) => {
      const lim = { tile: [150, 430, 70, 330], stile: [150, 430, 45, 120], row: [330, 560, 28, 150], box: [300, 560, 100, 420], orow: [560, 1500, 40, 130], card: [240, 300, 100, 175], wide: [560, 1500, 40, 600] }[kind];
      let e = el;
      if (lim) { while (e && e.parentElement) { const r = e.getBoundingClientRect(); if (r.width >= lim[0] && r.width <= lim[1] && r.height >= lim[2] && r.height <= lim[3]) break; e = e.parentElement; } }
      const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
    }, kind);
  }
  // scroll so the whole element sits clear of the sticky header and the caption strip
  async frame(loc, kind = "self") {
    await loc.scrollIntoViewIfNeeded();
    for (let i = 0; i < 2; i++) {
      const b = await this.domBox(loc, kind);
      if (b.y < 150 || b.y + b.h > H - 110) { const dy = b.y - Math.max(170, Math.min(300, (H - b.h) / 2 - 20)); if (this.rec) await this.r.scroll(dy, 0.8); else await this.page.evaluate((d) => window.scrollBy(0, d), dy); }
    }
  }
  async item(name, loc, { kind = "self", pad = 8, hold = 2.2, dx = 0.5, dy = 0.5, move = 0.9, click = false, preClick = 0, fill = false, also = null } = {}) {
    this.mark(name);
    await this.frame(loc, kind);
    if (fill) await this.ensureVisible(loc, true); // fields that are typed into next: settle the scroll now so the box stays valid while typing
    if (this.rec) await this.r.moveTo(loc, move, dx, dy);
    if (this.rec) {
      let b = await this.domBox(loc, kind); const k = 1920 / 1440, el = await loc.boundingBox();
      if (also) { const o = await this.domBox(also, "self"), x0 = Math.min(b.x, o.x), y0 = Math.min(b.y, o.y), x1 = Math.max(b.x + b.w, o.x + o.w), y1 = Math.max(b.y + b.h, o.y + o.h); b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
      const rect = { x: Math.round((b.x - pad) * k), y: Math.round((b.y - pad) * k), w: Math.round((b.w + 2 * pad) * k), h: Math.round((b.h + 2 * pad) * k) };
      this.rects = this.rects ?? {}; this.rects[name] = rect;
      const cx = this.r.mx * k, cy = this.r.my * k;
      this.checks = this.checks ?? {};
      this.checks[name] = { fullyVisible: b.y >= 80 && b.y + b.h <= H && b.x >= 0 && b.x + b.w <= 1440, rectInFrame: rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= 1920 && rect.y + rect.h <= 1080, cursorOnElement: !!el && cx >= (el.x - 4) * k && cx <= (el.x + el.width + 4) * k && cy >= (el.y - 4) * k && cy <= (el.y + el.height + 4) * k, rect, cursor: [Math.round(cx), Math.round(cy)] };
    }
    if (click && preClick) await this.hold(preClick);
    if (click) { if (this.rec) await this.r.click(loc, 0.3); else await loc.click(); await this.page.waitForTimeout(250); }
    await this.hold(hold);
  }
  // run page changes without recording (the scene then opens on the finished state)
  async silently(fn) { const was = this.rec; if (was) this.r.stop(); await fn(); if (was) { this.r.start(); await this.r.hold(0.1); } }
  async hold(s) { if (this.rec) await this.r.hold(s); else await this.page.waitForTimeout(40); }
  async move(x, y, s = 0.8) { if (this.rec) await this.r.move(x, y, s); }
  async moveTo(loc, s = 0.8, dx = 0.5, dy = 0.5) { await this.ensureVisible(loc); if (this.rec) await this.r.moveTo(loc, s, dx, dy); }
  async click(loc, s = 0.8) { await this.ensureVisible(loc); if (this.rec) await this.r.click(loc, s); else { await loc.click(); await this.page.waitForTimeout(60); } }
  async scrollBy(dy, s = 1.5) { if (this.rec) await this.r.scroll(dy, s); }
  async scrollTo(loc, s = 1.4, offset = 140) { if (this.rec) await this.r.scrollToEl(loc, s, offset); else await loc.scrollIntoViewIfNeeded(); }
  async top() { await this.page.evaluate(() => window.scrollTo(0, 0)); }
  // type text into a field; recorded as typing, cpf = characters per frame (30 fps)
  async type(loc, text, cpf = 3, s = 0.7) {
    await this.ensureVisible(loc, true);
    if (!this.rec) { await loc.fill(text); return; }
    await this.r.moveTo(loc, s); await loc.click(); await loc.fill("");
    for (let i = 0; i < text.length; i += cpf) { await this.page.keyboard.type(text.slice(i, i + cpf)); await this.r.cur(); await this.r.shot(); }
    await this.r.hold(0.3);
  }
  // set a field instantly but show it (cursor to field, one frame after)
  async set(loc, text, s = 0.6) {
    await this.ensureVisible(loc, true);
    if (this.rec) await this.r.moveTo(loc, s);
    await loc.fill(text);
    await this.hold(0.25);
  }
  async choose(loc, label, s = 0.6) {
    await this.ensureVisible(loc, true);
    if (this.rec) await this.r.moveTo(loc, s);
    try { await loc.selectOption(typeof label === "string" ? { label } : label, { timeout: 4000 }); }
    catch (e) { console.log("OPTIONS for", label, "=>", await loc.locator("option").allTextContents()); throw e; }
    await this.hold(0.3);
  }
  async finish(OUT, n) {
    this.r.stop(); const out = await this.r.finish();
    fs.mkdirSync(OUT, { recursive: true });
    fs.copyFileSync(out, path.join(OUT, `scene${n}.mp4`));
    fs.copyFileSync(out.replace(".mp4", ".marks.json"), path.join(OUT, `scene${n}.marks.json`));
    fs.writeFileSync(path.join(OUT, `scene${n}.rects.json`), JSON.stringify(this.rects ?? {}, null, 1));
    fs.writeFileSync(path.join(OUT, `scene${n}.checks.json`), JSON.stringify(this.checks ?? {}, null, 1));
    return JSON.parse(fs.readFileSync(out.replace(".mp4", ".marks.json"))).seconds;
  }
}
