import React, {createContext, useContext} from "react";
import {Easing, interpolate, useCurrentFrame} from "remotion";

export const C = {
  bg: "#0D131B", panel: "#17212E", panel2: "#1D2A3A", line: "#33455B",
  text: "#EAF0F6", mute: "#A3B3C5", amber: "#F5A524", green: "#3DDC97",
  red: "#FF5A5F", teal: "#2CC9D6", steel: "#86A5CF", pink: "#FF7AB6",
};
export const FONT = `Inter, "Liberation Sans", "DejaVu Sans", sans-serif`;
export const MONO = `"JetBrains Mono", "DejaVu Sans Mono", monospace`;

export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const IO = Easing.bezier(0.65, 0, 0.35, 1);
export const LIN = (x: number) => x;
export const BACK = Easing.bezier(0.34, 1.56, 0.64, 1);

export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Ctx = createContext({dur: 300, id: ""});
export const SceneProvider: React.FC<{dur: number; id: string; children: React.ReactNode}> = ({dur, id, children}) => (
  <Ctx.Provider value={{dur, id}}>{children}</Ctx.Provider>
);

/** Scene-relative progress. Every beat is a fraction of the scene, so re-timing scenes.json re-times the animation. */
export function useScene() {
  const frame = useCurrentFrame();
  const {dur} = useContext(Ctx);
  const p = frame / dur;
  const r = (a: number, b: number, e: (x: number) => number = OUT) =>
    interpolate(p, [a, b], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e});
  return {frame, dur, p, r, sec: frame / 30};
}

/** HTML element that fades and slides in over [a,b] (scene fractions). Optional exit [c,d]. */
export const Fade: React.FC<{
  a: number; b?: number; c?: number; d?: number; y?: number; x?: number; s?: number;
  style?: React.CSSProperties; children?: React.ReactNode; e?: (x: number) => number;
}> = ({a, b, c, d, y = 24, x = 0, s = 1, style, children, e = OUT}) => {
  const {r} = useScene();
  const bb = b ?? a + 0.04;
  const i = r(a, bb, e);
  const o = c !== undefined ? r(c, d ?? c + 0.04, IO) : 0;
  const v = i * (1 - o);
  return (
    <div style={{opacity: v, transform: `translate(${(1 - i) * x}px, ${(1 - i) * y}px) scale(${lerp(s, 1, i)})`, ...style}}>
      {children}
    </div>
  );
};

/** SVG group with same behaviour. */
export const GIn: React.FC<{
  a: number; b?: number; c?: number; d?: number; y?: number; x?: number; s?: number;
  children?: React.ReactNode; e?: (x: number) => number; origin?: string;
}> = ({a, b, c, d, y = 20, x = 0, s = 1, children, e = OUT, origin}) => {
  const {r} = useScene();
  const bb = b ?? a + 0.04;
  const i = r(a, bb, e);
  const o = c !== undefined ? r(c, d ?? c + 0.04, IO) : 0;
  const v = i * (1 - o);
  return (
    <g opacity={v} style={{transformBox: "fill-box", transformOrigin: origin ?? "center", transform: `translate(${(1 - i) * x}px, ${(1 - i) * y}px) scale(${lerp(s, 1, i)})`}}>
      {children}
    </g>
  );
};

/** Scene stage: background, dip-to-dark in/out, optional persistent badge. */
export const Stage: React.FC<{badge?: boolean; children: React.ReactNode}> = ({badge, children}) => {
  const frame = useCurrentFrame();
  const {dur} = useContext(Ctx);
  const f = 9;
  const o = Math.min(
    interpolate(frame, [0, f], [0, 1], {extrapolateRight: "clamp"}),
    interpolate(frame, [dur - f, dur], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
  );
  return (
    <div style={{position: "absolute", inset: 0, background: C.bg, fontFamily: FONT, color: C.text, overflow: "hidden"}}>
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(1300px 800px at 50% 25%, #1A2635 0%, #0D131B 70%)"}} />
      <div style={{position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(160,185,215,0.07) 1.5px, transparent 1.7px)", backgroundSize: "48px 48px"}} />
      <div style={{position: "absolute", inset: 0, opacity: o}}>{children}</div>
      {badge && <Badge />}
    </div>
  );
};

export const Badge: React.FC = () => (
  <div style={{
    position: "absolute", top: 34, right: 56, height: 62, padding: "0 26px", display: "flex", alignItems: "center",
    border: `2px solid ${C.amber}`, borderRadius: 10, color: C.amber, fontWeight: 700, fontSize: 36,
    letterSpacing: 3, background: "rgba(13,19,27,0.92)", zIndex: 50,
  }}>ILLUSTRATIVE EXAMPLE</div>
);

export const H1: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontSize: 72, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, ...style}}>{children}</div>
);

export const Abs: React.FC<{x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, style, children}) => (
  <div style={{position: "absolute", left: x, top: y, width: w, height: h, ...style}}>{children}</div>
);

export const Full: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: "absolute", left: 0, top: 0, ...style}}>{children}</svg>
);

export const Card: React.FC<{color?: string; style?: React.CSSProperties; children?: React.ReactNode}> = ({color = C.line, style, children}) => (
  <div style={{background: C.panel, border: `2px solid ${color}`, borderRadius: 20, boxShadow: "0 18px 50px rgba(0,0,0,0.35)", ...style}}>{children}</div>
);

export const Pill: React.FC<{color: string; children: React.ReactNode; style?: React.CSSProperties}> = ({color, children, style}) => (
  <div style={{display: "inline-flex", alignItems: "center", height: 60, padding: "0 28px", borderRadius: 30, border: `2px solid ${color}`, color, fontWeight: 700, fontSize: 36, letterSpacing: 2, background: "rgba(13,19,27,0.85)", ...style}}>{children}</div>
);

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const num = (n: number) => Math.round(n).toLocaleString("en-US");

/** Partial path draw helper */
export const dash = (len: number, t: number) => ({strokeDasharray: len, strokeDashoffset: len * (1 - t)});

export const Pump: React.FC<{color?: string; fill?: string; w?: number; sw?: number}> = ({color = C.steel, fill = "#1B2838", w = 360, sw = 6}) => (
  <svg width={w} height={w * 0.72} viewBox="0 0 360 260" style={{overflow: "visible"}}>
    <rect x="0" y="228" width="360" height="22" rx="4" fill={fill} stroke={color} strokeWidth={sw} />
    <rect x="16" y="120" width="120" height="108" rx="10" fill={fill} stroke={color} strokeWidth={sw} />
    <line x1="40" y1="120" x2="40" y2="228" stroke={color} strokeWidth={sw / 2} opacity="0.6" />
    <line x1="64" y1="120" x2="64" y2="228" stroke={color} strokeWidth={sw / 2} opacity="0.6" />
    <rect x="136" y="164" width="40" height="20" fill={fill} stroke={color} strokeWidth={sw} />
    <circle cx="256" cy="174" r="76" fill={fill} stroke={color} strokeWidth={sw} />
    <circle cx="256" cy="174" r="30" fill="none" stroke={color} strokeWidth={sw} />
    <rect x="234" y="30" width="44" height="72" fill={fill} stroke={color} strokeWidth={sw} />
    <rect x="224" y="16" width="64" height="16" rx="3" fill={fill} stroke={color} strokeWidth={sw} />
    <rect x="316" y="152" width="40" height="44" fill={fill} stroke={color} strokeWidth={sw} />
  </svg>
);

export const Wrench: React.FC<{color?: string; size?: number}> = ({color = C.amber, size = 160}) => (
  <svg width={size} height={size} viewBox="-60 -60 120 120">
    <g transform="rotate(-40)">
      <line x1={0} y1={-6} x2={0} y2={52} stroke={color} strokeWidth={19} strokeLinecap="round" />
      <path d="M-13 -52 A27 27 0 1 0 13 -52" fill="none" stroke={color} strokeWidth={17} strokeLinecap="round" />
    </g>
  </svg>
);

export const Check: React.FC<{size?: number; color?: string; t?: number; sw?: number}> = ({size = 48, color = C.green, t = 1, sw = 8}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M8 26 L20 38 L41 11" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...dash(60, t)} />
  </svg>
);
export const Cross: React.FC<{size?: number; color?: string; t?: number; sw?: number}> = ({size = 48, color = C.red, t = 1, sw = 8}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M10 10 L38 38" stroke={color} strokeWidth={sw} strokeLinecap="round" {...dash(40, clamp01(t * 2))} />
    <path d="M38 10 L10 38" stroke={color} strokeWidth={sw} strokeLinecap="round" {...dash(40, clamp01(t * 2 - 1))} />
  </svg>
);
export const FactoryShape: React.FC<{stroke: string; fill?: string; sw?: number; dashed?: boolean}> = ({stroke, fill = "none", sw = 5, dashed}) => (
  <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeDasharray={dashed ? "14 12" : undefined}>
    <rect x="320" y="-10" width="38" height="110" />
    <path d="M0 260 L0 100 L100 40 L100 100 L200 40 L200 100 L300 40 L300 100 L400 40 L400 260 Z" />
    <rect x="40" y="170" width="60" height="90" />
    <rect x="150" y="150" width="60" height="50" />
    <rect x="250" y="150" width="60" height="50" />
  </g>
);
