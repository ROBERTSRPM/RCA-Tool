import React from "react";
import {Abs, C, Card, Check, Cross, clamp01, dash, Fade, FONT, FactoryShape, Full, GIn, IO, LIN, lerp, money, MONO, num, OUT, Pill, Stage, useScene} from "../lib";

/* ---------------- S16 ---------------- */
// Timeline (fractions of the scene): 0.02-0.28 before/after bars, 0.30-0.46 payback, 0.48-0.62 recovered capacity,
// 0.64-1.00 natural vs forced deterioration. Every count-up finishes by about 0.58.
const Bullet: React.FC<{a: number; color: string; children: React.ReactNode; mark?: "check" | "cross"}> = ({a, color, children, mark = "check"}) => {
  const {r} = useScene();
  const t = r(a, a + 0.04);
  return (
    <div style={{display: "flex", alignItems: "center", gap: 22, fontSize: 38, fontWeight: 600, minHeight: 92, lineHeight: 1.15, opacity: t, transform: `translateX(${(1 - t) * 30}px)`}}>
      {mark === "check" ? <Check size={44} sw={9} color={color} t={t} /> : <Cross size={44} sw={9} color={color} t={t} />}
      <span style={mark === "cross" ? {textDecoration: "line-through", textDecorationColor: C.red, textDecorationThickness: 3, color: C.mute} : undefined}>{children}</span>
    </div>
  );
};
export const S16: React.FC = () => {
  const {r} = useScene();
  const A = r(0.01, 0.03) * (1 - r(0.28, 0.32, IO));
  const B = r(0.30, 0.34) * (1 - r(0.46, 0.50, IO));
  const Cc = r(0.48, 0.52) * (1 - r(0.62, 0.66, IO));
  const D = r(0.64, 0.68);
  const base = 900, hA = 500;
  const tA = r(0.04, 0.12), tB = r(0.12, 0.2);
  const months = r(0.40, 0.48, IO) * 1.6;
  const flagX = 120 + (1680 * 1.6) / 12;
  const hours = Math.round(84 * r(0.50, 0.57, IO)), tonnes = 10080 * r(0.51, 0.58, IO);
  const fill = lerp(0.1, 0.72, r(0.52, 0.60, IO));
  const nat = r(0.66, 0.72), forced = r(0.76, 0.82);
  return (
    <Stage badge>
      {/* Phase 1: zero breakdowns, loss gone */}
      <div style={{position: "absolute", inset: 0, opacity: A}}>
        <Abs x={80} y={110} w={1500} style={{fontSize: 72, fontWeight: 800}}><Fade a={0.01} b={0.06}>Twelve months later: <span style={{color: C.green}}>zero breakdowns</span></Fade></Abs>
        <Full>
          <line x1={240} y1={base} x2={1680} y2={base} stroke={C.line} strokeWidth={5} />
          <rect x={380} y={base - hA * tA} width={400} height={hA * tA} rx={14} fill={C.amber} />
          <rect x={1060} y={base - 8} width={400} height={8} rx={4} fill={C.green} opacity={tB} />
          <text x={580} y={base - hA * tA - 70} textAnchor="middle" fontSize={84} fontWeight={800} fill={C.amber} fontFamily={FONT} opacity={tA}>$238,440</text>
          <text x={580} y={base - hA * tA - 18} textAnchor="middle" fontSize={44} fontWeight={600} fill={C.mute} fontFamily={FONT} opacity={tA}>breakdown loss per year</text>
          <text x={1260} y={base - 110} textAnchor="middle" fontSize={120} fontWeight={800} fill={C.green} fontFamily={FONT} opacity={tB}>$0</text>
          <text x={1260} y={base - 40} textAnchor="middle" fontSize={44} fontWeight={600} fill={C.mute} fontFamily={FONT} opacity={tB}>breakdown loss per year</text>
          <text x={580} y={base + 70} textAnchor="middle" fontSize={50} fontWeight={700} fill={C.text} fontFamily={FONT}>Before: 6 breakdowns</text>
          <text x={1260} y={base + 70} textAnchor="middle" fontSize={50} fontWeight={700} fill={C.text} fontFamily={FONT}>After: 0 breakdowns</text>
          <g opacity={r(0.18, 0.24)}>
            <line x1={800} y1={base - hA} x2={1700} y2={base - hA} stroke={C.mute} strokeWidth={3} strokeDasharray="10 8" />
            <path d={`M1560 ${base - hA} V${base - 40}`} stroke={C.green} strokeWidth={8} fill="none" {...dash(600, r(0.19, 0.26))} />
            <path d={`M1536 ${base - 66} L1560 ${base - 30} L1584 ${base - 66}`} stroke={C.green} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={r(0.24, 0.27)} />
          </g>
        </Full>
        <Abs x={1600} y={380} w={300}>
          <Fade a={0.2} b={0.26} x={30} y={0}>
            <div style={{fontSize: 54, fontWeight: 800, color: C.green, lineHeight: 1.05}}>$238,440</div>
            <div style={{fontSize: 38, fontWeight: 600, color: C.mute, lineHeight: 1.2, marginTop: 6}}>saved per year</div>
          </Fade>
        </Abs>
      </div>

      {/* Phase 2: payback */}
      <div style={{position: "absolute", inset: 0, opacity: B}}>
        <Abs x={80} y={110} w={1700} style={{fontSize: 72, fontWeight: 800}}>Payback on the <span style={{color: C.amber}}>$32,000</span> spend</Abs>
        <Abs x={120} y={270} w={1700} style={{fontFamily: MONO, fontSize: 92, fontWeight: 700, lineHeight: 1.4}}>
          <Fade a={0.31} b={0.35}>$32,000 ÷ $238,440</Fade>
          <Fade a={0.35} b={0.39}><span style={{color: C.mute}}>= </span>0.13 years</Fade>
          <Fade a={0.38} b={0.42}><span style={{color: C.mute}}>= </span><span style={{color: C.green}}>about 7 weeks</span></Fade>
        </Abs>
        <Full>
          <g opacity={r(0.38, 0.42)}>
            <rect x={120} y={780} width={1680} height={72} rx={36} fill={C.panel2} stroke={C.line} strokeWidth={3} />
            <rect x={120} y={780} width={Math.max(4, (1680 * months) / 12)} height={72} rx={36} fill={C.green} />
            {[...Array(13)].map((_, i) => <line key={i} x1={120 + i * 140} y1={870} x2={120 + i * 140} y2={894} stroke={C.mute} strokeWidth={3} />)}
            <text x={120} y={960} fontSize={46} fill={C.mute} fontFamily={FONT} fontWeight={600}>Start</text>
            <text x={1800} y={960} textAnchor="end" fontSize={46} fill={C.mute} fontFamily={FONT} fontWeight={600}>12 months</text>
          </g>
          <g opacity={r(0.45, 0.48)} transform={`translate(${flagX} 0)`}>
            <line x1={0} y1={640} x2={0} y2={780} stroke={C.text} strokeWidth={6} />
            <path d="M0 640 H280 L255 678 L280 716 H0 Z" fill={C.green} />
            <text x={20} y={692} fontSize={42} fontWeight={800} fill="#08130e" fontFamily={FONT}>Paid back</text>
          </g>
        </Full>
      </div>

      {/* Phase 3: capacity recovered */}
      <div style={{position: "absolute", inset: 0, opacity: Cc}}>
        <svg width={1920} height={1080} style={{position: "absolute", left: 0, top: 0}}>
          <defs><clipPath id="hclip"><rect x={0} y={-20 + 290 * (1 - fill)} width={420} height={300} /></clipPath></defs>
          <g transform="translate(1180 260) scale(1.35)">
            <FactoryShape stroke={C.green} dashed sw={5} />
            <g clipPath="url(#hclip)" opacity={0.85}><FactoryShape stroke="none" fill={C.green} /></g>
            <FactoryShape stroke={C.green} sw={5} />
          </g>
          <text x={1460} y={760} textAnchor="middle" fontSize={54} fontWeight={800} fill={C.green} fontFamily={FONT}>Hidden plant, released</text>
        </svg>
        <Abs x={100} y={150} w={1100}>
          <div style={{display: "flex", alignItems: "baseline", gap: 28}}><span style={{fontFamily: MONO, fontSize: 220, fontWeight: 800, color: C.green}}>{hours}</span><span style={{fontSize: 80, fontWeight: 700}}>hours back</span></div>
          <div style={{fontFamily: MONO, fontSize: 40, color: C.mute, marginTop: -6, opacity: r(0.5, 0.53)}}>6 failures × 14 h = 84 h</div>
          <div style={{display: "flex", alignItems: "baseline", gap: 24, marginTop: 50}}><span style={{fontFamily: MONO, fontSize: 160, fontWeight: 800, color: C.green}}>{num(tonnes)} t</span></div>
          <div style={{fontFamily: MONO, fontSize: 40, color: C.mute, marginTop: -2, opacity: r(0.53, 0.56)}}>84 h × 120 t/h = 10,080 t</div>
          <div style={{fontSize: 56, fontWeight: 700, color: C.text, marginTop: 40}}>of capacity, from a pump already owned</div>
        </Abs>
      </div>

      {/* Phase 4: natural vs forced deterioration */}
      <div style={{position: "absolute", inset: 0, opacity: D}}>
        <Abs x={80} y={104} w={1760} style={{fontSize: 62, fontWeight: 800}}><Fade a={0.64} b={0.69}>Bearings and seals still wear. <span style={{color: C.amber}}>Not all wear is equal.</span></Fade></Abs>
        {/* left column */}
        <Abs x={80} y={220} w={850} h={800}>
          <div style={{height: "100%", opacity: nat, transform: `translateY(${(1 - nat) * 40}px)`}}>
            <Card color={C.teal} style={{height: "100%", boxSizing: "border-box", padding: "34px 44px", position: "relative"}}>
              <div style={{fontSize: 36, letterSpacing: 4, fontWeight: 800, color: C.teal}}>NATURAL DETERIORATION</div>
              <div style={{fontSize: 74, fontWeight: 800, color: C.teal, lineHeight: 1.05, marginTop: 8}}>Managed</div>
              <svg width={760} height={220} viewBox="0 0 760 220" style={{marginTop: 10}}>
                <line x1={30} y1={190} x2={730} y2={190} stroke={C.mute} strokeWidth={3} />
                <line x1={30} y1={190} x2={30} y2={20} stroke={C.mute} strokeWidth={3} />
                <line x1={30} y1={50} x2={730} y2={50} stroke={C.red} strokeWidth={3} strokeDasharray="10 8" />
                <text x={720} y={38} textAnchor="end" fontSize={28} fill={C.red} fontFamily={FONT} fontWeight={700}>failure limit</text>
                <path d="M30 180 L330 110 L330 180 L630 110" fill="none" stroke={C.teal} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" {...dash(700, r(0.70, 0.84, LIN))} />
                <text x={330} y={216} textAnchor="middle" fontSize={28} fill={C.amber} fontFamily={FONT} fontWeight={700} opacity={r(0.76, 0.80)}>planned shutdown</text>
              </svg>
              <div style={{marginTop: 20}}>
                <Bullet a={0.84} color={C.teal}>Vibration, oil and flush checks</Bullet>
                <Bullet a={0.89} color={C.teal}>Parts changed in a planned shutdown</Bullet>
                <Bullet a={0.94} color={C.teal}>Before they fail</Bullet>
              </div>
            </Card>
          </div>
        </Abs>
        {/* right column */}
        <Abs x={990} y={220} w={850} h={800}>
          <div style={{height: "100%", opacity: forced, transform: `translateY(${(1 - forced) * 40}px)`}}>
            <Card color={C.red} style={{height: "100%", boxSizing: "border-box", padding: "34px 44px", position: "relative"}}>
              <div style={{fontSize: 36, letterSpacing: 4, fontWeight: 800, color: C.red}}>FORCED DETERIORATION</div>
              <div style={{fontSize: 74, fontWeight: 800, color: C.green, lineHeight: 1.05, marginTop: 8}}>Removed</div>
              <svg width={760} height={220} viewBox="0 0 760 220" style={{marginTop: 10}}>
                <line x1={30} y1={190} x2={730} y2={190} stroke={C.mute} strokeWidth={3} />
                <line x1={30} y1={190} x2={30} y2={20} stroke={C.mute} strokeWidth={3} />
                <line x1={30} y1={50} x2={730} y2={50} stroke={C.red} strokeWidth={3} strokeDasharray="10 8" />
                <path d="M30 180 Q300 170 440 50" fill="none" stroke={C.red} strokeWidth={7} strokeLinecap="round" strokeDasharray={r(0.84, 0.9) > 0.5 ? "4 12" : undefined} opacity={1 - 0.6 * r(0.84, 0.9)} />
                <path d="M30 180 L730 150" fill="none" stroke={C.green} strokeWidth={7} strokeLinecap="round" opacity={r(0.86, 0.92)} />
                <text x={500} y={100} fontSize={30} fill={C.red} fontFamily={FONT} fontWeight={700} opacity={1 - 0.5 * r(0.84, 0.9)}>caused by us</text>
                <text x={730} y={210} textAnchor="end" fontSize={28} fill={C.green} fontFamily={FONT} fontWeight={700} opacity={r(0.88, 0.94)}>natural wear only</text>
              </svg>
              <div style={{fontSize: 40, fontWeight: 600, color: C.mute, lineHeight: 1.2, margin: "12px 0 14px"}}>The wear we were causing ourselves</div>
              <Bullet a={0.84} color={C.green} mark="cross">Running off its best point</Bullet>
              <Bullet a={0.89} color={C.green} mark="cross">Misalignment and soft foot</Bullet>
              <Bullet a={0.94} color={C.green} mark="cross">Dirty oil and a starved seal flush</Bullet>
            </Card>
          </div>
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
  const {r, frame, dur} = useScene();
  const times = [0.17, 0.24, 0.30, 0.36, 0.42, 0.50, 0.58];
  const intro = 1 - r(0.13, 0.17, IO);
  const loopO = r(0.15, 0.18) * (1 - r(0.80, 0.85, IO));
  const loopS = lerp(1, 0.55, r(0.80, 0.86, IO));
  const spin = ang(0) + (r(0.64, 0.66) > 0 ? ((frame - 0.64 * dur) * 0.016) : 0);
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
            <div style={{fontSize: 56, fontWeight: 700, color: C.text, marginTop: 14}}>A tool to make this easy:</div>
            <div style={{fontSize: 110, fontWeight: 800, letterSpacing: -2, color: C.amber, marginTop: 4}}>coming soon</div>
          </div>
        </Card>
      </div>
      <Abs x={0} y={720} w={1920} style={{textAlign: "center"}}>
        <Fade a={0.91} b={0.96} style={{fontSize: 70, fontWeight: 800, letterSpacing: -1}}>Pick one repeat failure. Run the six steps.</Fade>
        <Fade a={0.95} b={0.99} y={14} style={{marginTop: 44, fontSize: 52, fontWeight: 700, color: C.mute}}>Thanks for watching</Fade>
      </Abs>
    </Stage>
  );
};
