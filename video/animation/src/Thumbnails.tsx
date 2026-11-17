import React from "react";
import {AbsoluteFill} from "remotion";
import {C, FONT, FactoryShape, Pump, Wrench} from "./lib";

const Badge: React.FC = () => (
  <div style={{position: "absolute", top: 34, right: 40, padding: "10px 26px", borderRadius: 999, border: `4px solid ${C.steel}`, background: C.panel, color: C.text, fontFamily: FONT, fontWeight: 800, fontSize: 34, letterSpacing: 1}}>
    Worked example
  </div>
);
const Bg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: `radial-gradient(900px 600px at 25% 55%, #17212E 0%, ${C.bg} 70%)`, fontFamily: FONT, overflow: "hidden"}}>{children}</AbsoluteFill>
);
const Big: React.FC<{lines: string[]; size: number; sub: string; subSize: number}> = ({lines, size, sub, subSize}) => (
  <div style={{position: "absolute", left: 560, top: 150, width: 700}}>
    {lines.map((l) => (
      <div key={l} style={{fontSize: size, lineHeight: 0.98, fontWeight: 900, color: "#fff", letterSpacing: -4, whiteSpace: "nowrap", textShadow: "0 6px 0 rgba(0,0,0,0.35)"}}>{l}</div>
    ))}
    <div style={{marginTop: 34, fontSize: subSize, fontWeight: 800, color: C.amber, whiteSpace: "nowrap"}}>{sub}</div>
  </div>
);

export const ThumbPump: React.FC = () => {
  const items = [{x: 20, y: 70, n: 1, o: 0.55}, {x: 70, y: 250, n: 2, o: 0.8}, {x: 20, y: 430, n: 3, o: 1}];
  return (
    <Bg>
      {items.map((it) => (
        <div key={it.n} style={{position: "absolute", left: it.x, top: it.y, opacity: it.o}}>
          <Pump w={380} color={it.n === 3 ? C.steel : C.steel} sw={8} />
          <div style={{position: "absolute", left: 230, top: -22, transform: "rotate(-8deg)", background: C.amber, color: C.bg, fontWeight: 900, fontSize: 36, padding: "6px 16px", whiteSpace: "nowrap", borderRadius: 10, boxShadow: "0 6px 0 rgba(0,0,0,0.35)"}}>REPAIR #{it.n}</div>
          <div style={{position: "absolute", left: -30, top: 110}}><Wrench size={110} /></div>
        </div>
      ))}
      <Big lines={["FIXED IT", "AGAIN?"]} size={158} sub="Root Cause Analysis" subSize={62} />
      <Badge />
    </Bg>
  );
};

export const ThumbPlant: React.FC = () => (
  <Bg>
    <svg width={560} height={720} viewBox="0 0 560 720" style={{position: "absolute", left: 0, top: 0}}>
      <g transform="translate(120 190) scale(1.0)" opacity={0.9}><FactoryShape stroke={C.green} sw={8} dashed /></g>
      <g transform="translate(50 330) scale(1.05)"><FactoryShape stroke={C.teal} fill="#16303a" sw={9} /></g>
    </svg>
    <Big lines={["THE HIDDEN", "PLANT"]} size={108} sub="capacity you already own" subSize={50} />
    <Badge />
  </Bg>
);
