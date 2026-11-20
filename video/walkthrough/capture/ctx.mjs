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
    return JSON.parse(fs.readFileSync(out.replace(".mp4", ".marks.json"))).seconds;
  }
}
