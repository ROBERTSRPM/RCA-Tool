import {AbsoluteFill, Sequence, OffthreadVideo, staticFile, interpolate, useCurrentFrame, useVideoConfig, Easing, Freeze} from "remotion";
import plan from "../plan.json";

// Design tokens from web/app/globals.css (see design/design-review.md)
const C = {page: "#f8f9fb", surface: "#ffffff", border: "#e2e5ea", text: "#161a21", muted: "#586170", accent: "#c2410c", accent2: "#ea580c"};
const FONT = `Inter, system-ui, sans-serif`;
const fontFace = `@font-face{font-family:Inter;src:url(${staticFile("fonts/inter-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900;}`;
const ease = Easing.inOut(Easing.cubic);

type Zoom = {at: number; dur: number; cx: number; cy: number; scale: number; hold?: number};
type Cap = {text: string; at: number; dur: number};
type Hi = {at: number; dur: number; x: number; y: number; w: number; h: number};
type Seg = {at: number; dur: number; clipStart: number; rate: number; freeze?: boolean};
type Scene = {id: string; start: number; dur: number; clip?: string; segs?: Seg[]; zooms?: Zoom[]; captions?: Cap[]; highlights?: Hi[]; titleLen?: number; endcardLen?: number};

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
        {(s.segs ?? []).map((g, i) => {
          const v = <OffthreadVideo src={staticFile(`clips/${s.clip}`)} startFrom={Math.round(g.clipStart * fps)} playbackRate={g.rate} muted style={{width: 1920, height: 1080}} />;
          return (
            <Sequence key={i} from={Math.round(g.at * fps)} durationInFrames={Math.max(1, Math.round(g.dur * fps))}>
              {g.freeze ? <Freeze frame={0}>{v}</Freeze> : v}
            </Sequence>
          );
        })}
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
  const parts: JSX.Element[] = [];
  (plan.scenes as Scene[]).forEach((s) => {
    const sf = Math.round(s.start * fps);
    const df = Math.round((s.start + s.dur) * fps) - sf;
    const tl = Math.round((s.titleLen ?? 0) * fps);
    const el = Math.round((s.endcardLen ?? 0) * fps);
    parts.push(
      <Sequence key={s.id} from={sf} durationInFrames={df}>
        {tl > 0 && <Sequence from={0} durationInFrames={tl}><TitleCard dur={tl} /></Sequence>}
        {s.clip && <Sequence from={tl} durationInFrames={df - tl - el}><ClipScene s={{...s, segs: s.segs?.map((g) => ({...g, at: g.at - (s.titleLen ?? 0)})), captions: s.captions?.map((c) => ({...c, at: c.at - (s.titleLen ?? 0)})), highlights: s.highlights?.map((c) => ({...c, at: c.at - (s.titleLen ?? 0)})), zooms: s.zooms?.map((c) => ({...c, at: c.at - (s.titleLen ?? 0)}))}} /></Sequence>}
        {el > 0 && <Sequence from={df - el} durationInFrames={el}><EndCard dur={el} /></Sequence>}
      </Sequence>,
    );
  });
  return <AbsoluteFill style={{background: C.page}}><style>{fontFace}</style>{parts}</AbsoluteFill>;
};
