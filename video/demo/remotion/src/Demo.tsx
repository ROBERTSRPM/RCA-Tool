import {AbsoluteFill, Sequence, OffthreadVideo, staticFile, interpolate, useCurrentFrame, useVideoConfig, Easing, Audio} from "remotion";
import plan from "../plan.json";

// Design tokens from web/app/globals.css (see design/design-review.md)
const C = {page: "#f8f9fb", surface: "#ffffff", border: "#e2e5ea", text: "#161a21", muted: "#586170", accent: "#c2410c", accent2: "#ea580c"};
const FONT = `Inter, system-ui, sans-serif`;
const fontFace = `@font-face{font-family:Inter;src:url(${staticFile("fonts/inter-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900;}`;
const ease = Easing.inOut(Easing.cubic);

type Zoom = {at: number; dur: number; cx: number; cy: number; scale: number; hold?: number};
type Cap = {text: string; at: number; dur: number};
type Hi = {at: number; dur: number; x: number; y: number; w: number; h: number};
type Scene = {id: string; target: number; clip?: string; clipLen?: number; from?: number; len?: number; offset?: number; zooms?: Zoom[]; captions?: Cap[]; highlights?: Hi[]; title?: boolean; endcard?: boolean; audio?: string};

export const LogoMark = ({size = 64}: {size?: number}) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#161a21" />
    <path d="M9 16a7 7 0 0112.2-4.7M23 16a7 7 0 01-12.2 4.7" fill="none" stroke="#fff" strokeWidth="2.75" strokeLinecap="round" />
    <path d="M21.5 7.5v5h-5M10.5 24.5v-5h5" fill="none" stroke={C.accent2} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const fade = (f: number, dur: number, fi = 10, fo = 10) => {
  const a = Math.min(fi, dur / 3), b = Math.min(fo, dur / 3);
  return interpolate(f, [0, a, dur - b, dur], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
};

const TitleCard = ({dur}: {dur: number}) => {
  const f = useCurrentFrame();
  const o = fade(f, dur, 12, 12);
  const y = interpolate(f, [0, 20], [12, 0], {extrapolateRight: "clamp", easing: ease});
  return (
    <AbsoluteFill style={{background: C.page, alignItems: "center", justifyContent: "center", opacity: o}}>
      <div style={{transform: `translateY(${y}px)`, textAlign: "center", fontFamily: FONT}}>
        <div style={{display: "inline-flex", alignItems: "center", gap: 22}}>
          <LogoMark size={88} />
          <div style={{fontSize: 84, fontWeight: 600, letterSpacing: -1.5, color: C.text}}>
            RCA Pilot <span style={{fontSize: 34, fontWeight: 400, color: C.muted, letterSpacing: 0}}>by Intelbeyond</span>
          </div>
        </div>
        <div style={{width: 120, height: 4, background: C.accent, margin: "40px auto 34px", borderRadius: 2}} />
        <div style={{fontSize: 38, fontWeight: 400, color: C.muted, maxWidth: 1180, lineHeight: 1.35}}>
          Root cause analysis for maintenance, operations and plant teams
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard = ({dur}: {dur: number}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 18], [0, 1], {extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{background: C.page, alignItems: "center", justifyContent: "center", opacity: o, fontFamily: FONT}}>
      <div style={{textAlign: "center"}}>
        <div style={{display: "inline-flex", alignItems: "center", gap: 22}}>
          <LogoMark size={88} />
          <div style={{fontSize: 84, fontWeight: 600, letterSpacing: -1.5, color: C.text}}>
            RCA Pilot <span style={{fontSize: 34, fontWeight: 400, color: C.muted, letterSpacing: 0}}>by Intelbeyond</span>
          </div>
        </div>
        <div style={{width: 120, height: 4, background: C.accent, margin: "40px auto 34px", borderRadius: 2}} />
        <div style={{fontSize: 40, color: C.muted}}>The AI suggests. Your people decide.</div>
        <div style={{fontSize: 52, fontWeight: 600, color: C.text, marginTop: 36}}>
          Try it at <span style={{color: C.accent}}>www.rcapilot.com</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Caption = ({text, dur}: {text: string; dur: number}) => {
  const f = useCurrentFrame();
  const o = fade(f, dur, 9, 9);
  const x = interpolate(f, [0, 14], [-24, 0], {extrapolateRight: "clamp", easing: ease});
  return (
    <div style={{position: "absolute", left: 72, bottom: 64, opacity: o, transform: `translateX(${x}px)`, fontFamily: FONT,
      display: "flex", alignItems: "stretch", background: "rgba(255,255,255,0.97)", border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 6px 24px rgba(22,26,33,0.22)", overflow: "hidden"}}>
      <div style={{width: 8, background: C.accent}} />
      <div style={{padding: "16px 28px", fontSize: 34, fontWeight: 600, color: C.text, letterSpacing: -0.3}}>{text}</div>
    </div>
  );
};

const Highlight = ({h, dur}: {h: Hi; dur: number}) => {
  const f = useCurrentFrame();
  const o = fade(f, dur, 10, 10);
  return <div style={{position: "absolute", left: h.x - 10, top: h.y - 8, width: h.w + 20, height: h.h + 16, border: `4px solid ${C.accent2}`, borderRadius: 8, opacity: o, boxShadow: "0 0 0 9999px rgba(22,26,33,0.10)"}} />;
};

const ClipScene = ({s}: {s: Scene}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const from = s.from ?? 0;
  const len = s.len ?? s.target - (s.offset ?? 0);
  const clipLen = s.clipLen ?? len;
  const avail = clipLen - from;
  const rate = Math.min(1.6, Math.max(0.8, avail / len));
  // zoom keyframes: interpolate between identity and each zoom
  let scale = 1, ox = 960, oy = 540;
  for (const z of s.zooms ?? []) {
    const hold = z.hold ?? z.dur;
    const r = Math.min(0.6, hold / 3);
    const a = interpolate(t, [z.at, z.at + r, z.at + hold - r, z.at + hold], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
    if (a > 0) { scale = 1 + (z.scale - 1) * a; ox = z.cx; oy = z.cy; }
  }
  return (
    <AbsoluteFill style={{background: C.page}}>
      <AbsoluteFill style={{transform: `scale(${scale})`, transformOrigin: `${ox}px ${oy}px`}}>
        <OffthreadVideo src={staticFile(`clips/${s.clip}`)} startFrom={Math.round(from * fps)} playbackRate={rate} muted style={{width: 1920, height: 1080}} />
        {(s.highlights ?? []).map((h, i) => (
          <Sequence key={i} from={Math.round(h.at * fps)} durationInFrames={Math.round(h.dur * fps)}><Highlight h={h} dur={Math.round(h.dur * fps)} /></Sequence>
        ))}
      </AbsoluteFill>
      {(s.captions ?? []).map((c, i) => (
        <Sequence key={i} from={Math.round(c.at * fps)} durationInFrames={Math.round(c.dur * fps)}><Caption text={c.text} dur={Math.round(c.dur * fps)} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const Demo = () => {
  const {fps} = useVideoConfig();
  let start = 0;
  const parts: JSX.Element[] = [];
  (plan.scenes as Scene[]).forEach((s) => {
    const sf = Math.round(start * fps), df = Math.round(s.target * fps);
    const off = Math.round((s.offset ?? 0) * fps);
    const endcardAt = s.endcard ? Math.round((s.target - 5.5) * fps) : df;
    parts.push(
      <Sequence key={s.id} from={sf} durationInFrames={df}>
        {s.title && <Sequence from={0} durationInFrames={off}><TitleCard dur={off} /></Sequence>}
        {s.clip && <Sequence from={off} durationInFrames={endcardAt - off}><ClipScene s={{...s, target: (endcardAt - off) / fps, offset: 0}} /></Sequence>}
        {s.endcard && <Sequence from={endcardAt} durationInFrames={df - endcardAt}><EndCard dur={df - endcardAt} /></Sequence>}
        {s.audio && <Audio src={staticFile(s.audio)} />}
      </Sequence>,
    );
    start += s.target;
  });
  return <AbsoluteFill style={{background: C.page}}><style>{fontFace}</style>{parts}</AbsoluteFill>;
};
