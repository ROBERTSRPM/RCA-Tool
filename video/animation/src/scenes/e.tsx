import React from "react";
import {Abs, C, Card, Check, clamp01, dash, Fade, FONT, FactoryShape, Full, GIn, IO, LIN, lerp, money, MONO, num, OUT, Pill, Stage, useScene} from "../lib";

/* ---------------- S16 ---------------- */
export const S16: React.FC = () => {
  const {r} = useScene();
  const A = 1 - r(0.44, 0.49, IO);
  const B = r(0.49, 0.53) * (1 - r(0.74, 0.79, IO));
  const Cc = r(0.79, 0.84);
  const base = 800, hA = 460, hB = 460 * (39740 / 238440);
  const tA = r(0.04, 0.16), tB = r(0.17, 0.27);
  const months = r(0.60, 0.70, IO) * 3.6;
  const flagX = 120 + (1680 * 3.6) / 12;
  const hours = Math.round(70 * r(0.82, 0.90, IO)), tonnes = 8400 * r(0.84, 0.94, IO);
  const fill = lerp(0.1, 0.72, r(0.84, 0.97, IO));
  return (
    <Stage badge>
      <Full>
        <defs><clipPath id="hclip"><rect x={0} y={-20 + 290 * (1 - fill)} width={420} height={300} /></clipPath></defs>
        <g opacity={A}>
          <line x1={400} y1={base} x2={1500} y2={base} stroke={C.line} strokeWidth={5} />
          <rect x={520} y={base - hA * tA} width={300} height={hA * tA} rx={12} fill={C.amber} />
          <rect x={1100} y={base - hB * tB} width={300} height={hB * tB} rx={12} fill={C.green} />
          <text x={670} y={base - hA * tA - 70} textAnchor="middle" fontSize={64} fontWeight={800} fill={C.amber} fontFamily={FONT} opacity={tA}>$238,440</text>
          <text x={670} y={base - hA * tA - 20} textAnchor="middle" fontSize={40} fontWeight={600} fill={C.mute} fontFamily={FONT} opacity={tA}>per year</text>
          <text x={1250} y={base - hB * tB - 70} textAnchor="middle" fontSize={64} fontWeight={800} fill={C.green} fontFamily={FONT} opacity={tB}>$39,740</text>
          <text x={1250} y={base - hB * tB - 20} textAnchor="middle" fontSize={40} fontWeight={600} fill={C.mute} fontFamily={FONT} opacity={tB}>per year</text>
          <text x={670} y={base + 68} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.text} fontFamily={FONT}>Before: 6 failures</text>
          <text x={1250} y={base + 68} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.text} fontFamily={FONT}>After: 1 failure</text>
          <g opacity={r(0.32, 0.38)}>
            <line x1={830} y1={base - hA} x2={1560} y2={base - hA} stroke={C.mute} strokeWidth={3} strokeDasharray="10 8" />
            <path d={`M1470 ${base - hA} V${base - hB - 130}`} stroke={C.green} strokeWidth={6} fill="none" {...dash(300, r(0.34, 0.41))} />
            <path d={`M1450 ${base - hB - 150} L1470 ${base - hB - 118} L1490 ${base - hB - 150}`} stroke={C.green} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </Full>
      <Abs x={80} y={120} w={1500} style={{fontSize: 58, fontWeight: 800, opacity: A}}><Fade a={0.02} b={0.07}>Yearly loss on P-101</Fade></Abs>
      <Abs x={1540} y={400} w={360} style={{opacity: A}}>
        <Fade a={0.38} b={0.44} x={30} y={0}>
          <div style={{fontSize: 60, fontWeight: 800, color: C.green}}>$198,700</div>
          <div style={{fontSize: 40, fontWeight: 600, color: C.mute, lineHeight: 1.2}}>saved per year</div>
        </Fade>
      </Abs>

      <div style={{position: "absolute", inset: 0, opacity: B}}>
        <Abs x={80} y={120} w={1500} style={{fontSize: 58, fontWeight: 800}}>Payback on the $60,000 spend</Abs>
        <Abs x={120} y={230} w={1600} style={{fontFamily: MONO, fontSize: 66, fontWeight: 700, lineHeight: 1.35}}>
          <Fade a={0.50} b={0.55}>$60,000 ÷ $198,700</Fade>
          <Fade a={0.55} b={0.60}><span style={{color: C.mute}}>= </span>0.30 years</Fade>
          <Fade a={0.59} b={0.64}><span style={{color: C.mute}}>= </span><span style={{color: C.green}}>about 3.6 months</span></Fade>
        </Abs>
        <Full>
          <g opacity={r(0.58, 0.63)}>
            <rect x={120} y={760} width={1680} height={56} rx={28} fill={C.panel2} stroke={C.line} strokeWidth={3} />
            <rect x={120} y={760} width={Math.max(4, (1680 * months) / 12)} height={56} rx={28} fill={C.green} />
            {[...Array(13)].map((_, i) => <line key={i} x1={120 + i * 140} y1={830} x2={120 + i * 140} y2={850} stroke={C.mute} strokeWidth={3} />)}
            <text x={120} y={905} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>Start</text>
            <text x={1800} y={905} textAnchor="end" fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>12 months</text>
          </g>
          <g opacity={r(0.69, 0.73)} transform={`translate(${flagX} 0)`}>
            <line x1={0} y1={640} x2={0} y2={760} stroke={C.text} strokeWidth={6} />
            <path d="M0 640 H260 L235 676 L260 712 H0 Z" fill={C.green} />
            <text x={20} y={690} fontSize={40} fontWeight={800} fill="#08130e" fontFamily={FONT}>Paid back</text>
          </g>
        </Full>
      </div>

      <div style={{position: "absolute", inset: 0, opacity: Cc}}>
        <Full>
          <defs />
          <g transform="translate(1050 250) scale(1.3)">
            <FactoryShape stroke={C.green} dashed sw={5} />
            <g clipPath="url(#hclip)" opacity={0.85}><FactoryShape stroke="none" fill={C.green} /></g>
            <FactoryShape stroke={C.green} sw={5} />
          </g>
          <text x={1310} y={690} textAnchor="middle" fontSize={50} fontWeight={800} fill={C.green} fontFamily={FONT}>Hidden plant, released</text>
        </Full>
        <Abs x={110} y={190} w={850}>
          <div style={{display: "flex", alignItems: "baseline", gap: 24}}><span style={{fontFamily: MONO, fontSize: 170, fontWeight: 800, color: C.green}}>{hours}</span><span style={{fontSize: 64, fontWeight: 700}}>hours back</span></div>
          <div style={{display: "flex", alignItems: "baseline", gap: 24, marginTop: 60}}><span style={{fontFamily: MONO, fontSize: 120, fontWeight: 800, color: C.green}}>{num(tonnes)} t</span></div>
          <div style={{fontSize: 56, fontWeight: 700, color: C.mute, marginTop: 6}}>of capacity, from a pump already owned</div>
        </Abs>
      </div>
    </Stage>
  );
};

/* ---------------- S17 ---------------- */
const labels = ["Trigger", "Problem and loss", "Evidence", "Cause tree", "Verify", "Actions with owners and dates", "Check at 90 days and 12 months"];
const CX = 960, CY = 590, RX = 720, RY = 370;
const ang = (k: number) => ((-90 + (k * 360) / 7) * Math.PI) / 180;
const pt = (a: number): [number, number] => [CX + RX * Math.cos(a), CY + RY * Math.sin(a)];
export const S17: React.FC = () => {
  const {r, frame} = useScene();
  const times = [0.17, 0.24, 0.30, 0.36, 0.42, 0.50, 0.58];
  const intro = 1 - r(0.13, 0.17, IO);
  const loopO = r(0.15, 0.18) * (1 - r(0.80, 0.85, IO));
  const loopS = lerp(1, 0.55, r(0.80, 0.86, IO));
  const spin = ang(0) + (r(0.64, 0.66) > 0 ? ((frame - 0.64 * 1590) * 0.016) : 0);
  const [dx, dy] = pt(spin);
  const win = r(0.84, 0.90);
  const chart = r(0.66, 0.76);
  const vals = [300, 240, 170, 90, 30];
  return (
    <Stage>
      <Abs x={0} y={350} w={1920} style={{textAlign: "center", opacity: intro}}>
        <Fade a={0.02} b={0.07} style={{fontSize: 96, fontWeight: 800, letterSpacing: -2}}>RCA is not an event.</Fade>
        <Fade a={0.08} b={0.13} style={{fontSize: 96, fontWeight: 800, letterSpacing: -2, color: C.amber, marginTop: 10}}>It is a system.</Fade>
      </Abs>
      <div style={{position: "absolute", inset: 0, opacity: loopO, transform: `scale(${loopS})`, transformOrigin: "960px 590px"}}>
        <Full>
          {labels.map((_, k) => {
            const a0 = ang(k), a1 = ang(k + 1) + (k === 6 ? 0 : 0);
            const a1n = k === 6 ? ang(7) : a1;
            const tk = k === 6 ? r(0.62, 0.68) : r(times[k + 1] - 0.03, times[k + 1] + 0.01);
            const pts = [...Array(21)].map((_, i) => pt(lerp(a0, a1n, i / 20)));
            const d = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
            const am = lerp(a0, a1n, 0.78);
            const [ax, ay] = pt(am);
            const tx = -RX * Math.sin(am), ty = RY * Math.cos(am);
            const rot = (Math.atan2(ty, tx) * 180) / Math.PI;
            return (
              <g key={k}>
                <path d={d} fill="none" stroke={C.amber} strokeWidth={6} strokeOpacity={0.7} {...dash(900, tk)} />
                <g transform={`translate(${ax} ${ay}) rotate(${rot})`} opacity={tk > 0.9 ? 1 : 0}><path d="M-14 -16 L16 0 L-14 16 Z" fill={C.amber} /></g>
              </g>
            );
          })}
          <circle cx={dx} cy={dy} r={14} fill="#fff" opacity={r(0.66, 0.68)} />
        </Full>
        {labels.map((t, k) => {
          const [x, y] = pt(ang(k));
          const hot = k === 0;
          return (
            <Abs key={k} x={x - 200} y={y - 55} w={400} h={110}>
              <Fade a={times[k] - 0.02} b={times[k] + 0.03} y={0} s={0.85} style={{height: "100%"}}>
                <div style={{height: "100%", boxSizing: "border-box", background: C.panel, border: `3px solid ${hot ? C.amber : k === 6 ? C.green : C.steel}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 38, fontWeight: 700, lineHeight: 1.15, padding: "0 16px"}}>{t}</div>
              </Fade>
            </Abs>
          );
        })}
        <Fade a={0.66} b={0.72} y={0} style={{position: "absolute", left: 640, top: 430, width: 640, textAlign: "center", opacity: chart}}>
          <svg width={640} height={260} viewBox="0 0 640 260">
            <line x1={60} y1={210} x2={600} y2={210} stroke={C.mute} strokeWidth={4} /><line x1={60} y1={210} x2={60} y2={20} stroke={C.mute} strokeWidth={4} />
            <path d={vals.map((v, i) => `${i ? "L" : "M"}${110 + i * 115} ${210 - v * 0.6}`).join(" ")} fill="none" stroke={C.green} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" {...dash(700, r(0.68, 0.78))} />
          </svg>
          <div style={{fontSize: 38, fontWeight: 700, color: C.text, marginTop: -4}}>Failures per quarter</div>
        </Fade>
      </div>

      <div style={{position: "absolute", left: 480, top: 130, width: 960, height: 520, opacity: win, transform: `scale(${lerp(0.7, 1, win)})`}}>
        <Card color={C.amber} style={{height: "100%", position: "relative", overflow: "hidden"}}>
          <div style={{height: 64, background: C.panel2, display: "flex", alignItems: "center", gap: 14, paddingLeft: 24, borderBottom: `2px solid ${C.line}`}}>
            {[C.red, C.amber, C.green].map((c) => <div key={c} style={{width: 22, height: 22, borderRadius: 11, background: c}} />)}
          </div>
          <div style={{textAlign: "center", paddingTop: 36}}>
            <svg width={120} height={120} viewBox="-60 -60 120 120">
              <circle r={44} fill="none" stroke={C.amber} strokeWidth={9} strokeDasharray="200 76" strokeLinecap="round" />
              <path d="M30 -48 L48 -22 L18 -22 Z" fill={C.amber} />
              <circle r={14} fill={C.green} />
            </svg>
            <div style={{fontSize: 92, fontWeight: 800, letterSpacing: -2, color: C.amber, marginTop: 10}}>Coming soon</div>
            <div style={{fontSize: 46, fontWeight: 600, color: C.text, marginTop: 14}}>Root cause analysis, made easy</div>
          </div>
        </Card>
      </div>
      <Abs x={0} y={720} w={1920} style={{textAlign: "center"}}>
        <Fade a={0.91} b={0.96} style={{fontSize: 70, fontWeight: 800, letterSpacing: -1}}>Pick one repeat failure. Run the six steps.</Fade>
        <Fade a={0.95} b={0.99} y={14} style={{marginTop: 44}}><Pill color={C.red} style={{background: C.red, color: "#fff", height: 84, fontSize: 44, padding: "0 56px", letterSpacing: 1}}>Subscribe for what comes next</Pill></Fade>
      </Abs>
    </Stage>
  );
};
