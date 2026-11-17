import React from "react";
import {Abs, C, Card, Check, Cross, dash, Fade, FONT, Full, GIn, H1, IO, lerp, money, MONO, OUT, Pill, Stage, useScene} from "../lib";

type Span = [number, number];
const SHOWN: Span = [-1, -0.9];

const Node: React.FC<{x: number; y: number; w: number; h: number; color: string; text: string; t: Span; size?: number; glow?: number}> = ({x, y, w, h, color, text, t, size = 40, glow = 0}) => (
  <Abs x={x} y={y} w={w} h={h}>
    <Fade a={t[0]} b={t[1]} y={24} s={0.96} style={{height: "100%"}}>
      <div style={{height: "100%", boxSizing: "border-box", background: `linear-gradient(${color}26, ${color}26), ${C.panel}`, border: `3px solid ${color}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: size, fontWeight: 700, lineHeight: 1.15, padding: "0 16px", boxShadow: glow > 0 ? `0 0 ${40 * glow}px ${color}aa` : undefined}}>{text}</div>
    </Fade>
  </Abs>
);

const L1X = [288, 736, 1184, 1632];
const L1 = ["Off best efficiency point", "Misalignment and soft foot", "Contaminated oil", "Restricted seal flush"];
const L2 = ["Discharge valve throttled", "Aligned by straight edge, soft foot not checked", "Wash-down hose aimed at bearing housing", "Flush strainer not checked"];
const L3 = ["Duty not reviewed after throughput change", "No precision alignment standard", "Rebuild procedure gaps", "No post-repair verification", "Flush and oil not on inspection route", "Failures coded only as bearing failed"];
const L3X = [90, 680, 1270];

const Elbow: React.FC<{x1: number; y1: number; x2: number; y2: number; ym: number; t: number; color?: string}> = ({x1, y1, x2, y2, ym, t, color = C.line}) => (
  <path d={`M${x1} ${y1} V${ym} H${x2} V${y2}`} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" {...dash(Math.abs(y2 - y1) + Math.abs(x2 - x1) + 20, t)} />
);

const TreeCanvas: React.FC<{
  camY: number; top: Span; p1: Span; l1: Span[]; p2: Span; l2: Span[]; p3: Span; l3: Span[]; glow: number; bracket: Span; badge: Span; extra?: React.ReactNode;
}> = ({camY, top, p1, l1, p2, l2, p3, l3, glow, bracket, badge, extra}) => {
  const {r} = useScene();
  const rr = (s: Span) => r(s[0], s[1]);
  return (
    <div style={{position: "absolute", inset: 0, WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, transparent 96px, #000 132px)", maskImage: "linear-gradient(to bottom, transparent 0px, transparent 96px, #000 132px)"}}>
      <div style={{position: "absolute", left: 0, top: 0, width: 1920, height: 1700, transform: `translateY(${camY}px)`}}>
        <svg width={1920} height={1700} style={{position: "absolute", left: 0, top: 0}}>
          <g opacity={rr(p1)}><rect x={40} y={305} width={1840} height={305} rx={22} fill={C.steel} fillOpacity={0.08} stroke={C.steel} strokeOpacity={0.5} strokeWidth={2} /></g>
          <g opacity={rr(p2)}><rect x={40} y={625} width={1840} height={340} rx={22} fill={C.amber} fillOpacity={0.07} stroke={C.amber} strokeOpacity={0.5} strokeWidth={2} /></g>
          <g opacity={rr(p3)}><rect x={40} y={985} width={1840} height={420} rx={22} fill={C.teal} fillOpacity={0.09} stroke={C.teal} strokeOpacity={0.6} strokeWidth={2} /></g>
          {L1X.map((x, i) => <Elbow key={"a" + i} x1={960} y1={270} x2={x} y2={410} ym={298} t={rr(l1[i])} />)}
          {L1X.map((x, i) => <Elbow key={"b" + i} x1={x} y1={590} x2={x} y2={720} ym={655} t={rr(l2[i])} />)}
          {L1X.map((x, i) => <Elbow key={"c" + i} x1={x} y1={940} x2={x} y2={985} ym={960} t={rr(p3) > 0 ? rr(l2[i]) : 0} />)}
          <g opacity={rr(bracket)}>
            <path d="M90 1425 V1450 H1830 V1425 M960 1450 V1478" fill="none" stroke={C.teal} strokeWidth={6} strokeLinecap="round" />
          </g>
        </svg>
        <Abs x={0} y={150} w={1920}>
          <div style={{display: "flex", justifyContent: "center"}}>
            <Fade a={top[0]} b={top[1]} y={20} style={{width: 760, height: 120}}>
              <div style={{height: "100%", boxSizing: "border-box", background: `linear-gradient(${C.red}26, ${C.red}26), ${C.panel}`, border: `3px solid ${C.red}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, fontWeight: 800, textAlign: "center", lineHeight: 1.1, padding: "0 20px"}}>Seals and bearings fail early</div>
            </Fade>
          </div>
        </Abs>
        <Abs x={0} y={322} w={1920} style={{textAlign: "center"}}><Fade a={p1[0]} b={p1[1]} y={0}><Pill color={C.steel}>PHYSICAL CAUSES</Pill></Fade></Abs>
        <Abs x={0} y={642} w={1920} style={{textAlign: "center"}}><Fade a={p2[0]} b={p2[1]} y={0}><Pill color={C.amber}>HUMAN CAUSES</Pill></Fade></Abs>
        <Abs x={0} y={997} w={1920} style={{textAlign: "center"}}><Fade a={p3[0]} b={p3[1]} y={0}><Pill color={C.teal}>SYSTEM (LATENT) CAUSES</Pill></Fade></Abs>
        {L1.map((t, i) => <Node key={i} x={L1X[i] - 210} y={410} w={420} h={180} color={C.steel} text={t} t={l1[i]} />)}
        {L2.map((t, i) => <Node key={i} x={L1X[i] - 210} y={720} w={420} h={220} color={C.amber} text={t} t={l2[i]} size={38} />)}
        {L3.map((t, i) => <Node key={i} x={L3X[i % 3]} y={1075 + Math.floor(i / 3) * 160} w={560} h={140} color={C.teal} text={t} t={l3[i]} size={38} glow={glow} />)}
        <Abs x={0} y={1484} w={1920} style={{textAlign: "center", fontSize: 50, fontWeight: 800, color: C.teal, letterSpacing: 4, opacity: rr(bracket)}}>ROOT CAUSES</Abs>
        <Abs x={0} y={1568} w={1920} style={{textAlign: "center", opacity: rr(badge)}}><Pill color={C.amber} style={{fontSize: 40, letterSpacing: 0, height: 72}}>Fix the system, not the person</Pill></Abs>
        {extra}
      </div>
    </div>
  );
};

/* ---------------- S13 ---------------- */
export const S13: React.FC = () => {
  const {r} = useScene();
  const k = r(0.34, 0.42, IO);
  const inset = r(0.26, 0.31) * (1 - r(0.43, 0.46, IO));
  const lift = 26 * (1 - k);
  return (
    <Stage badge>
      <TreeCanvas camY={0} top={[0.02, 0.08]}
        p1={[0.08, 0.12]} l1={[[0.10, 0.15], [0.20, 0.25], [0.46, 0.51], [0.54, 0.59]]}
        p2={[0.64, 0.68]} l2={[[0.68, 0.73], [0.76, 0.81], [0.84, 0.89], [0.91, 0.96]]}
        p3={[2, 3]} l3={[[2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3]]} glow={0} bracket={[2, 3]} badge={[2, 3]} />
      <div style={{position: "absolute", left: 410, top: 640, width: 1100, height: 400, opacity: inset}}>
        <Card color={C.steel} style={{height: "100%", position: "relative"}}>
          <svg width={1100} height={400} viewBox="0 0 1100 400" style={{position: "absolute", inset: 0}}>
            <line x1={80} y1={290} x2={1020} y2={290} stroke={C.mute} strokeWidth={4} strokeDasharray="10 8" />
            <rect x={330} y={100} width={420} height={70} rx={10} fill="#2B3C52" stroke={C.steel} strokeWidth={4} />
            <path d={`M170 205 L650 205 Q820 205 900 ${205 + 26 * k}`} fill="none" stroke={C.steel} strokeWidth={30} strokeLinecap="round" />
            <rect x={170} y={220} width={90} height={70} fill="#2B3C52" stroke={C.steel} strokeWidth={4} />
            <rect x={810} y={222 + 26 * k - 0} width={90} height={Math.max(2, 68 - 26 * k + 26 * k - 26 * (1 - k) * 0 - (26 * k))} fill="#2B3C52" stroke={C.steel} strokeWidth={4} opacity={0} />
            <rect x={810} y={220 + 26 * k} width={90} height={70 - 26 * k} fill="#2B3C52" stroke={C.red} strokeWidth={4} />
            <g transform={`translate(855 ${70 + 26 * k})`}>
              <rect x={-9} y={0} width={18} height={110} fill={C.amber} />
              <rect x={-30} y={-24} width={60} height={26} rx={5} fill={C.amber} />
            </g>
            <text x={930} y={284} fontSize={36} fontWeight={700} fill={C.red} fontFamily={FONT} opacity={1 - k}>gap</text>
            <text x={50} y={64} fontSize={42} fontWeight={800} fill={C.text} fontFamily={FONT}>Soft foot: one foot is not flat</text>
            <text x={550} y={375} textAnchor="middle" fontSize={38} fontWeight={600} fill={C.amber} fontFamily={FONT} opacity={k}>Tighten the bolt and the frame bends</text>
          </svg>
        </Card>
      </div>
    </Stage>
  );
};

/* ---------------- S14 ---------------- */
export const S14: React.FC = () => {
  const {r} = useScene();
  const cam = lerp(0, -610, r(0.02, 0.20, IO));
  const glow = r(0.78, 0.86);
  return (
    <Stage badge>
      <TreeCanvas camY={cam} top={SHOWN} p1={SHOWN} l1={[SHOWN, SHOWN, SHOWN, SHOWN]} p2={SHOWN} l2={[SHOWN, SHOWN, SHOWN, SHOWN]}
        p3={[0.14, 0.2]} l3={[[0.20, 0.25], [0.32, 0.37], [0.44, 0.49], [0.56, 0.61], [0.68, 0.73], [0.78, 0.83]]}
        glow={glow} bracket={[0.86, 0.91]} badge={[0.92, 0.97]} />
    </Stage>
  );
};

/* ---------------- S15 ---------------- */
const roots: [string, string][] = [
  ["Duty not reviewed after throughput change", "Flow trend"],
  ["No precision alignment standard", "Records missing"],
  ["Rebuild procedure gaps", "Procedure review"],
  ["No post-repair verification", "Job close-outs"],
  ["Flush and oil not on inspection route", "Inspection routes"],
  ["Failures coded only as bearing failed", "Maintenance history"],
];
const actions: [string, string, string, number, string?][] = [
  ["Variable speed drive: slow the pump", "Reliability engineer", "Week 8", 28000, "Runs near its best point, valve wide open"],
  ["Seal flush indicator, on inspection route", "Mechanical supervisor", "Week 4", 12000, "Clean flush protects the seal faces"],
  ["Alignment standard, laser tool, training", "Maintenance manager", "Weeks 4 and 8", 8000, "Fitters trained to the standard"],
  ["Sealed housings, rebuild checklist", "Supervisor and planner", "Week 6", 7000, "Vibration reading before handover"],
  ["Engineering and project time", "Reliability engineer", "Weeks 1 to 8", 5000],
];
export const S15: React.FC = () => {
  const {r} = useScene();
  const p1o = 1 - r(0.30, 0.34, IO);
  const drop = r(0.24, 0.28);
  return (
    <Stage badge>
      <div style={{opacity: p1o}}>
        <Abs x={60} y={104} w={1300} style={{fontSize: 58, fontWeight: 800}}><Fade a={0.0} b={0.05}>Test each cause against the evidence</Fade></Abs>
        {roots.map(([t, ev], i) => {
          const x = [90, 680, 1270][i % 3], y = 230 + Math.floor(i / 3) * 235;
          const a = 0.02 + i * 0.008;
          const tk = 0.05 + i * 0.022;
          return (
            <Abs key={i} x={x} y={y} w={560} h={205}>
              <Fade a={a} b={a + 0.04} y={24} style={{height: "100%"}}>
                <div style={{height: "100%", boxSizing: "border-box", background: `linear-gradient(${C.teal}26, ${C.teal}26), ${C.panel}`, border: `3px solid ${r(tk, tk + 0.03) > 0.5 ? C.green : C.teal}`, borderRadius: 16, padding: "14px 20px", position: "relative"}}>
                  <div style={{fontSize: 38, fontWeight: 700, lineHeight: 1.15, paddingRight: 56}}>{t}</div>
                  <div style={{position: "absolute", left: 20, bottom: 14, display: "flex", alignItems: "center", gap: 12, fontSize: 36, fontWeight: 700, color: C.green, opacity: r(tk - 0.04, tk), transform: `translateX(${(1 - r(tk - 0.04, tk)) * -120}px)`}}>
                    <div style={{width: 18, height: 18, borderRadius: 9, background: C.green}} />{ev}
                  </div>
                  <div style={{position: "absolute", right: 16, top: 14}}><Check size={46} sw={9} t={r(tk, tk + 0.03)} /></div>
                </div>
              </Fade>
            </Abs>
          );
        })}
        <Abs x={640} y={730} w={640} h={150}>
          <Fade a={0.20} b={0.24} y={24} style={{height: "100%"}}>
            <div style={{height: "100%", boxSizing: "border-box", borderRadius: 16, border: `3px ${drop > 0.5 ? "dashed" : "solid"} ${drop > 0.5 ? "#6F8197" : C.steel}`, background: drop > 0.5 ? "#1A222D" : C.panel, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, fontSize: 42, fontWeight: 700, color: drop > 0.5 ? "#7F90A4" : C.text, textDecoration: drop > 0.5 ? "line-through" : "none", position: "relative"}}>
              Bad bearing batch
              <div style={{position: "absolute", right: 18, top: 12, textDecoration: "none"}}><Cross size={46} color={C.red} t={r(0.27, 0.30)} sw={9} /></div>
            </div>
          </Fade>
        </Abs>
        <Abs x={640} y={900} w={640} style={{textAlign: "center", fontSize: 44, fontWeight: 700, color: C.red}}><Fade a={0.28} b={0.31}>No evidence, dropped</Fade></Abs>
      </div>

      <Abs x={80} y={104} w={1500} style={{fontSize: 58, fontWeight: 800}}><Fade a={0.33} b={0.37}>Actions with an owner and a due date</Fade></Abs>
      <Abs x={80} y={190} w={1760}>
        <Fade a={0.33} b={0.37} y={20}>
          <div style={{display: "flex", height: 70, alignItems: "center", fontSize: 36, fontWeight: 800, color: C.mute, letterSpacing: 2, borderBottom: `3px solid ${C.amber}`}}>
            <div style={{width: 800, paddingLeft: 16}}>ACTION</div><div style={{width: 460}}>OWNER</div><div style={{width: 280}}>DUE</div><div style={{width: 220, textAlign: "right", paddingRight: 16}}>COST</div>
          </div>
        </Fade>
        {actions.map(([a, o, dd, c, sub], i) => {
          const t0 = 0.36 + i * 0.12;
          return (
            <Fade key={i} a={t0} b={t0 + 0.04} x={-40} y={0}>
              <div style={{display: "flex", height: 124, alignItems: "center", fontSize: 38, fontWeight: 600, borderBottom: `2px solid ${C.line}`}}>
                <div style={{width: 800, paddingLeft: 16}}><div style={{fontWeight: 700}}>{a}</div>{sub && <div style={{fontSize: 30, color: C.teal, fontWeight: 600, marginTop: 4}}>{sub}</div>}</div>
                <div style={{width: 460, color: C.mute, fontSize: 34}}>{o}</div><div style={{width: 280, color: C.mute, fontSize: 34}}>{dd}</div>
                <div style={{width: 220, textAlign: "right", paddingRight: 16, fontFamily: MONO, fontWeight: 700, color: C.text}}>{money(c)}</div>
              </div>
            </Fade>
          );
        })}
        <Fade a={0.90} b={0.95} y={10}>
          <div style={{display: "flex", height: 110, alignItems: "center", fontSize: 50, fontWeight: 800, justifyContent: "space-between", padding: "0 16px"}}>
            <div style={{fontFamily: MONO, fontSize: 36, color: C.mute, fontWeight: 600}}>$28,000 + $12,000 + $8,000 + $7,000 + $5,000</div>
            <div>Total <span style={{color: C.amber, fontFamily: MONO}}>= $60,000</span></div>
          </div>
        </Fade>
      </Abs>
    </Stage>
  );
};
