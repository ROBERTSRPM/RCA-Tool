// Screen-capture helper: deterministic frame-by-frame recording with a cursor overlay.
// Secrets (share link, password) come from environment variables / local files, never the repo.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const require = createRequire("/opt/node22/lib/node_modules/");
export const { chromium } = require("playwright");

export const BASE = process.env.DEMO_BASE; // branch preview URL, no secrets
export const FPS = 30;
export const W = 1440, H = 810, DSF = 1920 / 1440; // 1920x1080 output, text at 1.33x

export const HIDE_CSS = `
[data-testid="account-menu-button"] span.truncate { visibility: hidden !important; }
#__cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; z-index: 2147483647; pointer-events: none;
  transform: translate(-3px,-2px); filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
#__ring { position: fixed; left: 0; top: 0; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
  border: 3px solid #c2410c; z-index: 2147483646; pointer-events: none; opacity: 0; }
`;
const CURSOR_JS = `
(() => {
  const add = () => {
    if (document.getElementById('__cursor')) return;
    const st = document.createElement('style'); st.textContent = ${JSON.stringify(HIDE_CSS)}; document.documentElement.appendChild(st);
    const c = document.createElement('div'); c.id = '__cursor';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 17 L7 13.5 L9.8 19.5 L12.2 18.4 L9.5 12.6 L14.5 12.6 Z" fill="#161a21" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const r = document.createElement('div'); r.id = '__ring'; document.documentElement.appendChild(r);
    window.__cur = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; r.style.left = x + 'px'; r.style.top = y + 'px'; };
    window.__click = (on) => { r.style.opacity = on ? '0.85' : '0'; };
  };
  window.__ensure = () => { try { add(); } catch (e) {} };
  window.__ensure(); document.addEventListener('DOMContentLoaded', window.__ensure); setInterval(window.__ensure, 300);
})();`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Recorder {
  constructor(page, outDir, name) {
    this.page = page; this.name = name;
    this.dir = path.join(outDir, name); fs.rmSync(this.dir, { recursive: true, force: true }); fs.mkdirSync(this.dir, { recursive: true });
    this.n = 0; this.on = false; this.mx = 720; this.my = 405; this.last = null; this.log = [];
  }
  async cur() { await this.page.evaluate(([x, y]) => (window.__ensure(), window.__cur(x, y)), [this.mx, this.my]); }
  async shot() {
    const f = path.join(this.dir, `f${String(this.n++).padStart(6, "0")}.jpg`);
    await this.page.screenshot({ path: f, type: "jpeg", quality: 95 });
    this.last = f;
  }
  // hold: repeat the last frame for `sec` seconds (free: no screenshots needed)
  async hold(sec) {
    if (this.on) { await this.cur(); await this.shot(); const dup = Math.round(sec * FPS) - 1; for (let i = 0; i < dup; i++) { fs.linkSync(this.last, path.join(this.dir, `f${String(this.n++).padStart(6, "0")}.jpg`)); } }
    else await this.page.waitForTimeout(sec * 1000);
  }
  start() { this.on = true; }
  stop() { this.on = false; }
  mark(label) { this.log.push({ label, t: +(this.n / FPS).toFixed(2) }); }
  async move(x, y, sec = 0.8) {
    const x0 = this.mx, y0 = this.my, steps = Math.max(1, Math.round(sec * FPS));
    for (let i = 1; i <= steps; i++) {
      const e = ease(i / steps); this.mx = x0 + (x - x0) * e; this.my = y0 + (y - y0) * e;
      await this.page.mouse.move(this.mx, this.my);
      if (this.on) { await this.cur(); await this.shot(); }
    }
  }
  async moveTo(loc, sec = 0.8, dx = 0.5, dy = 0.5) {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    await this.move(b.x + b.width * dx, b.y + b.height * dy, sec);
  }
  async click(loc, sec = 0.8) {
    await this.moveTo(loc, sec);
    await this.page.evaluate(() => (window.__ensure(), window.__click(true))); await this.hold(0.15);
    await loc.click({ force: true }); await this.page.evaluate(() => window.__click(false));
    await this.hold(0.2);
  }
  // smooth scroll the window (or element) by dy css px
  async scroll(dy, sec = 1.5) {
    const y0 = await this.page.evaluate(() => window.scrollY); const steps = Math.round(sec * FPS);
    for (let i = 1; i <= steps; i++) {
      await this.page.evaluate((y) => window.scrollTo(0, y), y0 + dy * ease(i / steps));
      if (this.on) { await this.cur(); await this.shot(); }
    }
  }
  async scrollToEl(loc, sec = 1.5, offset = 120) {
    const y = await loc.evaluate((e, off) => e.getBoundingClientRect().top + window.scrollY - off, offset);
    const y0 = await this.page.evaluate(() => window.scrollY); await this.scroll(y - y0, sec);
  }
  async finish(fps = FPS) {
    const out = path.join(this.dir, "..", `${this.name}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(this.dir, "f%06d.jpg"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-r", String(fps), out]);
    fs.writeFileSync(path.join(this.dir, "..", `${this.name}.marks.json`), JSON.stringify({ frames: this.n, seconds: this.n / FPS, marks: this.log }, null, 1));
    fs.rmSync(this.dir, { recursive: true, force: true });
    return out;
  }
}

export async function launch(storageState) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--force-device-scale-factor=" + DSF] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, storageState, bypassCSP: true });
  await context.addInitScript(CURSOR_JS);
  return { browser, context, page: await context.newPage() };
}

export async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/app/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}
