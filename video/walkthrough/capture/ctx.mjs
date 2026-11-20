// Capture context: records frame by frame when a Recorder is on, otherwise replays instantly ("fast" mode) to rebuild state.
import fs from "node:fs";
import path from "node:path";
import { Recorder } from "./lib.mjs";

export class Ctx {
  constructor(page, S) { this.page = page; this.S = S; this.r = null; }
  get rec() { return !!(this.r && this.r.on); }
  startRecording(n) { this.r = new Recorder(this.page, path.join(this.S, "wframes"), `w${n}`); this.r.start(); }
  stopRecording() { if (this.r) this.r.stop(); }
  mark(l) { if (this.rec) this.r.mark(l); }
  async hold(s) { if (this.rec) await this.r.hold(s); else await this.page.waitForTimeout(40); }
  async move(x, y, s = 0.8) { if (this.rec) await this.r.move(x, y, s); }
  async moveTo(loc, s = 0.8, dx = 0.5, dy = 0.5) { if (this.rec) await this.r.moveTo(loc, s, dx, dy); else await loc.scrollIntoViewIfNeeded(); }
  async click(loc, s = 0.8) { if (this.rec) await this.r.click(loc, s); else { await loc.scrollIntoViewIfNeeded(); await loc.click(); await this.page.waitForTimeout(60); } }
  async scrollBy(dy, s = 1.5) { if (this.rec) await this.r.scroll(dy, s); }
  async scrollTo(loc, s = 1.4, offset = 140) { if (this.rec) await this.r.scrollToEl(loc, s, offset); else await loc.scrollIntoViewIfNeeded(); }
  async top() { await this.page.evaluate(() => window.scrollTo(0, 0)); }
  // type text into a field; recorded as typing, cpf = characters per frame (30 fps)
  async type(loc, text, cpf = 3, s = 0.7) {
    await loc.scrollIntoViewIfNeeded();
    if (!this.rec) { await loc.fill(text); return; }
    await this.r.moveTo(loc, s); await loc.click(); await loc.fill("");
    for (let i = 0; i < text.length; i += cpf) { await this.page.keyboard.type(text.slice(i, i + cpf)); await this.r.cur(); await this.r.shot(); }
    await this.r.hold(0.3);
  }
  // set a field instantly but show it (cursor to field, one frame after)
  async set(loc, text, s = 0.6) {
    await loc.scrollIntoViewIfNeeded();
    if (this.rec) await this.r.moveTo(loc, s);
    await loc.fill(text);
    await this.hold(0.25);
  }
  async choose(loc, label, s = 0.6) {
    await loc.scrollIntoViewIfNeeded();
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
    return JSON.parse(fs.readFileSync(out.replace(".mp4", ".marks.json"))).seconds;
  }
}
