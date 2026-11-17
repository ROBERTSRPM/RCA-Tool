import React from "react";
import {Abs, C, Card, Check, clamp01, dash, Fade, FONT, FactoryShape, Full, GIn, H1, IO, LIN, lerp, OUT, rand, Stage, useScene, BACK} from "../lib";

/* ---------------- S5 ---------------- */
const LoopNode: React.FC<{x: number; y: number; t: string; a: number}> = ({x, y, t, a}) => (
  <Abs x={x} y={y} w={380} h={140}>
    <Fade a={a} b={a + 0.04} y={20} style={{height: "100%"}}>
      <div style={{height: "100%", background: C.panel2, border: `3px solid ${C.amber}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 44, fontWeight: 700, lineHeight: 1.15, padding: "0 20px"}}>{t}</div>
    </Fade>
  </Abs>
);
const Bar: React.FC<{x: number; h: number; color: string; t: number; base: number}> = ({x, h, color, t, base}) => (
  <rect x={x} y={base - h * t} width={170} height={h * t} rx={10} fill={color} />
);
export const S05: React.FC = () => {
  const {r, frame} = useScene();
  const ph1 = 1 - r(0.40, 0.45, IO);
  const spin = r(0.2, 0.42, LIN) > 0 ? ((frame * 0.008) % 1) : 0;
  const pts = [[240, 320], [700, 320], [700, 720], [240, 720]];
  const seg = Math.floor(spin * 4), f = spin * 4 - seg;
  const A = pts[seg], B = pts[(seg + 1) % 4];
  const dot = [lerp(A[0], B[0], f), lerp(A[1], B[1], f)];
  const base = 690;
  const k = (a: number, b: number) => r(a, b);
  return (
    <Stage>
      <div style={{opacity: ph1}}>
        <Abs x={40} y={100} w={900} style={{textAlign: "center", fontSize: 52, fontWeight: 800, color: C.amber}}><Fade a={0.02} b={0.07}>Firefighting cycle</Fade></Abs>
        <Abs x={1000} y={100} w={880} style={{textAlign: "center", fontSize: 52, fontWeight: 800, color: C.green}}><Fade a={0.20} b={0.25}>Calm operation</Fade></Abs>
        <Full>
          <GIn a={0.07} b={0.12} y={0}>
            <path d="M240 320 H700 V720 H240 Z" fill="none" stroke={C.amber} strokeWidth={7} strokeDasharray="2 0" opacity={0.75} />
            <path d="M458 296 L492 320 L458 344 Z" fill={C.amber} />
            <path d="M676 508 L700 542 L724 508 Z" fill={C.amber} />
            <path d="M482 696 L448 720 L482 744 Z" fill={C.amber} />
            <path d="M264 532 L240 498 L216 532 Z" fill={C.amber} />
          </GIn>
          <circle cx={dot[0]} cy={dot[1]} r={16} fill="#fff" opacity={r(0.2, 0.24)} />
          <line x1={960} y1={170} x2={960} y2={900} stroke={C.line} strokeWidth={3} opacity={r(0.17, 0.22)} />
          <line x1={1040} y1={540} x2={1800} y2={540} stroke={C.green} strokeWidth={16} strokeLinecap="round" {...dash(760, r(0.24, 0.36))} />
          <path d="M1760 490 L1830 540 L1760 590" fill="none" stroke={C.green} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={r(0.33, 0.37)} />
        </Full>
        <LoopNode x={50} y={250} t="Breakdown" a={0.08} />
        <LoopNode x={510} y={250} t="Emergency work" a={0.11} />
        <LoopNode x={510} y={650} t="Planned work slips" a={0.14} />
        <LoopNode x={50} y={650} t="Next breakdown" a={0.17} />
        <Abs x={1000} y={600} w={880} style={{textAlign: "center", fontSize: 56, fontWeight: 800}}><Fade a={0.30} b={0.36}>Uninterrupted operation</Fade></Abs>
      </div>
      <Full>
        <g opacity={r(0.46, 0.50)} transform="translate(-130 0)">
          <line x1={200} y1={base} x2={1560} y2={base} stroke={C.line} strokeWidth={4} />
          <Bar x={330} h={440} color={C.amber} t={k(0.48, 0.58)} base={base} />
          <Bar x={540} h={300} color={C.green} t={k(0.54, 0.66)} base={base} />
          <Bar x={1050} h={190} color={C.amber} t={k(0.62, 0.72)} base={base} />
          <Bar x={1260} h={390} color={C.green} t={k(0.66, 0.78)} base={base} />
          <text x={625} y={base + 66} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.text} fontFamily={FONT}>Cost per unit</text>
          <text x={1345} y={base + 66} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.text} fontFamily={FONT}>Profit</text>
          <rect x={560} y={base + 110} width={30} height={30} rx={6} fill={C.amber} />
          <text x={604} y={base + 138} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>Firefighting</text>
          <rect x={930} y={base + 110} width={30} height={30} rx={6} fill={C.green} />
          <text x={974} y={base + 138} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>Uninterrupted</text>
        </g>
      </Full>
      <Abs x={0} y={110} w={1920} style={{textAlign: "center", fontSize: 60, fontWeight: 800}}><Fade a={0.50} b={0.56}>Same fixed costs, <span style={{color: C.green}}>more good output</span></Fade></Abs>
      <Abs x={40} y={900} w={1340} style={{textAlign: "center", fontSize: 64, fontWeight: 800}}><Fade a={0.86} b={0.92}>No new equipment. No major project.</Fade></Abs>
    </Stage>
  );
};

/* ---------------- S6 ---------------- */
const lostBlocks = [
  {d: 0, x: 0.03, w: 54}, {d: 0, x: 0.09, w: 90}, {d: 1, x: 0.04, w: 44}, {d: 2, x: 0.08, w: 70}, {d: 2, x: 0.1, w: 40},
  {d: 3, x: 0.02, w: 96}, {d: 4, x: 0.07, w: 50}, {d: 5, x: 0.05, w: 66}, {d: 6, x: 0.03, w: 44}, {d: 4, x: 0.09, w: 36},
];
export const S06: React.FC = () => {
  const {r} = useScene();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sx = 110, sw = 1260, dw = sw / 7;
  const ghostX = lerp(140, 780, r(0.12, 0.22, IO));
  const fill = r(0.54, 0.74, IO);
  const gY = 170, S = 1.3;
  const solidDone = fill > 0.98;
  return (
    <Stage>
      <Full>
        <defs>
          <clipPath id="gclip"><rect x={0} y={-20 + 280 * (1 - fill)} width={420} height={300 * fill + 10} /></clipPath>
        </defs>
        <g transform={`translate(${ghostX} ${gY}) scale(${S})`} opacity={r(0.12, 0.18)}>
          <FactoryShape stroke={solidDone ? C.green : C.green} dashed={!solidDone} sw={5} />
          <g clipPath="url(#gclip)" opacity={0.85}><FactoryShape stroke="none" fill={C.green} /></g>
          <g opacity={fill > 0.3 ? 1 : 0}><FactoryShape stroke={C.green} sw={5} /></g>
        </g>
        <g transform={`translate(140 ${gY}) scale(${S})`} opacity={r(0.02, 0.1)}>
          <FactoryShape stroke={C.teal} fill="#16303a" sw={5} />
        </g>
        <GIn a={0.03} b={0.1} y={0}><text x={480} y={590} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.teal} fontFamily={FONT}>Your plant</text></GIn>
        <GIn a={0.16} b={0.22} y={0}><text x={1040} y={590} textAnchor="middle" fontSize={44} fontWeight={800} fill={C.green} fontFamily={FONT}>The hidden plant</text></GIn>
        {/* weekly strip */}
        <g opacity={r(0.2, 0.26)}>
          <text x={sx} y={668} fontSize={38} fill={C.mute} fontFamily={FONT} fontWeight={600}>One week of lost hours</text>
          <rect x={sx} y={690} width={sw} height={110} rx={14} fill={C.panel} stroke={C.line} strokeWidth={3} />
          {days.map((d, i) => (
            <g key={d}>
              {i > 0 && <line x1={sx + i * dw} y1={690} x2={sx + i * dw} y2={800} stroke={C.line} strokeWidth={2} />}
              <text x={sx + i * dw + dw / 2} y={846} textAnchor="middle" fontSize={36} fill={C.mute} fontFamily={FONT} fontWeight={600}>{d}</text>
            </g>
          ))}
          {lostBlocks.map((b, i) => {
            const bx = sx + b.d * dw + b.x * dw * 3, by = 712;
            const t0 = 0.26 + i * 0.016;
            const appear = r(t0, t0 + 0.02);
            const fl = r(0.5 + i * 0.012, 0.66 + i * 0.012, IO);
            const tx = 880 + (rand(i + 3) * 380), ty = 330 + rand(i + 9) * 150;
            const x = lerp(bx, tx, fl), y = lerp(by, ty, fl) - Math.sin(fl * Math.PI) * 120;
            return <rect key={i} x={x} y={y} width={b.w * (1 - 0.5 * fl)} height={66 * (1 - 0.4 * fl)} rx={8} fill={C.amber} opacity={appear * (1 - r(0.68 + i * 0.01, 0.74 + i * 0.01))} />;
          })}
        </g>
      </Full>
      <Abs x={1360} y={190} w={520}>
        {["Built", "Staffed", "Paid for"].map((t, i) => (
          <Fade key={t} a={0.76 + i * 0.04} b={0.80 + i * 0.04} x={40} y={0} style={{marginBottom: 26}}>
            <div style={{display: "flex", alignItems: "center", gap: 20, height: 84, padding: "0 26px", background: C.panel, border: `2px solid ${C.green}`, borderRadius: 14, fontSize: 48, fontWeight: 700, width: 360}}>
              <Check size={44} sw={9} t={r(0.78 + i * 0.04, 0.82 + i * 0.04)} />{t}
            </div>
          </Fade>
        ))}
      </Abs>
      <Abs x={0} y={90} w={1920} style={{textAlign: "center", fontSize: 56, fontWeight: 800}}>
        <Fade a={0.64} b={0.72} y={10} style={{display: "none"}}>{""}</Fade>
      </Abs>
      <Abs x={110} y={920} w={1260}>
        <Fade a={0.87} b={0.91} c={0.96} d={0.995} y={10}>
          <Card color={C.amber} style={{padding: "16px 30px", fontSize: 44, fontWeight: 700, textAlign: "center"}}><span style={{color: C.amber}}>CAPEX</span> = money spent on new assets</Card>
        </Fade>
      </Abs>
      <Abs x={780} y={640} w={560} style={{display: "none"}} />
      <Abs x={1300} y={590} w={560} style={{display: "none"}} />
      <Abs x={140} y={75} w={1000} style={{fontSize: 40, fontWeight: 700, color: C.mute}}>
        <Fade a={0.62} b={0.7} y={0} style={{display: "none"}}>x</Fade>
      </Abs>
      <Abs x={1360} y={560} w={520} style={{fontSize: 44, fontWeight: 700, color: C.green}}>
        <Fade a={0.72} b={0.78} y={0}>Capacity you<br />already own</Fade>
      </Abs>
    </Stage>
  );
};

/* ---------------- S8 ---------------- */
const steps = ["Problem statement", "Evidence before opinions", "Cause and effect tree", "Check against evidence", "Actions: owner and date", "Check it worked"];
const Icon: React.FC<{k: number}> = ({k}) => (
  <svg width={130} height={130} viewBox="0 0 130 130" fill="none" stroke={C.text} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
    {k === 0 && <g><rect x={14} y={38} width={102} height={70} rx={12} /><path d="M44 38 L52 22 H78 L86 38" /><circle cx={65} cy={73} r={20} /></g>}
    {k === 1 && <g><path d="M16 16 V112 H116" /><path d="M26 88 L52 58 L72 74 L110 28" stroke={C.amber} /></g>}
    {k === 2 && <g><rect x={26} y={14} width={80} height={102} rx={8} /><path d="M26 14 V116" strokeWidth={14} /><path d="M52 44 H92 M52 68 H92 M52 92 H78" /></g>}
    {k === 3 && <g><path d="M10 84 L26 116 H104 L120 84 Z" /><circle cx={65} cy={56} r={24} stroke={C.amber} /><path d="M58 34 L70 56 L58 78" stroke={C.red} strokeWidth={5} /></g>}
  </svg>
);
export const S08: React.FC = () => {
  const {r} = useScene();
  const lit = [0.08, 0.34, 0.62];
  const cardT = [[0.10, 0.33], [0.36, 0.60], [0.64, 0.99]];
  const rows = ["What", "Where", "When", "Loss"];
  return (
    <Stage>
      <Abs x={60} y={110} w={840}>
        {steps.map((s, i) => {
          const on = i < 3 ? r(lit[i], lit[i] + 0.04) : 0;
          return (
            <Fade key={s} a={0.0 + i * 0.012} b={0.05 + i * 0.012} x={-30} y={0} style={{height: 142}}>
              <div style={{display: "flex", alignItems: "center", gap: 26, height: 120, padding: "0 22px", borderRadius: 18, background: on > 0.5 ? "rgba(245,165,36,0.12)" : "transparent", border: `2px solid ${on > 0.5 ? C.amber : "transparent"}`}}>
                <div style={{width: 72, height: 72, borderRadius: 36, border: `4px solid ${on > 0.5 ? C.amber : "#4A5B70"}`, background: on > 0.5 ? C.amber : "transparent", color: on > 0.5 ? "#10161e" : "#6B7D92", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800}}>{i + 1}</div>
                <div style={{fontSize: 50, fontWeight: 700, color: on > 0.5 ? C.text : "#6F8197"}}>{s}</div>
              </div>
            </Fade>
          );
        })}
      </Abs>
      {/* card 1 */}
      <Abs x={930} y={120} w={900} h={620}>
        <Fade a={cardT[0][0]} b={cardT[0][0] + 0.04} c={cardT[0][1]} d={cardT[0][1] + 0.03} x={50} y={0} style={{height: "100%"}}>
          <Card color={C.amber} style={{height: "100%", padding: 44}}>
            <div style={{fontSize: 56, fontWeight: 800, marginBottom: 24}}>Problem statement</div>
            {rows.map((t, i) => (
              <div key={t} style={{display: "flex", alignItems: "center", gap: 30, height: 120}}>
                <div style={{width: 170, fontSize: 46, fontWeight: 700, color: C.mute}}>{t}</div>
                <div style={{flex: 1}}>
                  <div style={{height: 26, borderRadius: 13, background: i === 3 ? C.amber : C.line, width: `${r(0.14 + i * 0.045, 0.19 + i * 0.045) * (i === 3 ? 95 : 70 + i * 8)}%`}} />
                  {i === 3 && <div style={{fontSize: 38, color: C.amber, marginTop: 12, opacity: r(0.28, 0.31)}}>hours, tonnes, dollars</div>}
                </div>
              </div>
            ))}
          </Card>
        </Fade>
        {/* card 2 */}
        <Fade a={cardT[1][0]} b={cardT[1][0] + 0.04} c={cardT[1][1]} d={cardT[1][1] + 0.03} x={50} y={0} style={{position: "absolute", inset: 0}}>
          <Card color={C.amber} style={{height: "100%", padding: 44}}>
            <div style={{fontSize: 56, fontWeight: 800, marginBottom: 50}}>Evidence before opinions</div>
            <div style={{display: "flex", justifyContent: "space-between"}}>
              {["Photos", "Trends", "Logs", "Parts"].map((t, i) => (
                <Fade key={t} a={0.38 + i * 0.045} b={0.42 + i * 0.045} y={-90} style={{textAlign: "center", width: 190}}>
                  <div style={{height: 190, borderRadius: 18, background: C.panel2, border: `2px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center"}}><Icon k={i} /></div>
                  <div style={{fontSize: 40, fontWeight: 700, marginTop: 20}}>{t}</div>
                </Fade>
              ))}
            </div>
          </Card>
        </Fade>
        {/* card 3 */}
        <Fade a={cardT[2][0]} b={cardT[2][0] + 0.04} c={0.985} d={0.998} x={50} y={0} style={{position: "absolute", inset: 0}}>
          <Card color={C.amber} style={{height: "100%"}}>
            <svg width={896} height={616} viewBox="0 30 896 616" style={{position: "absolute", inset: 0}}>
              {[0, 1, 2].map((i) => {
                const cx = 448 + (i - 1) * 270;
                const t = r(0.68 + i * 0.045, 0.74 + i * 0.045);
                return (
                  <g key={i} opacity={t}>
                    <path d={`M448 250 V300 H${cx} V330`} fill="none" stroke={C.line} strokeWidth={5} />
                    {[0, 1].map((j) => {
                      const lx = cx + (j - 0.5) * 130;
                      const tt = r(0.79 + i * 0.03, 0.84 + i * 0.03);
                      return (
                        <g key={j} opacity={tt}>
                          <path d={`M${cx} 390 V430 H${lx} V470`} fill="none" stroke={C.line} strokeWidth={5} />
                          <rect x={lx - 52} y={470} width={104} height={64} rx={12} fill={C.panel2} stroke={C.teal} strokeWidth={4} />
                        </g>
                      );
                    })}
                    <rect x={cx - 66} y={330} width={132} height={64} rx={12} fill={C.panel2} stroke={C.steel} strokeWidth={4} />
                  </g>
                );
              })}
              <g opacity={r(0.65, 0.7)}><rect x={348} y={180} width={200} height={70} rx={14} fill={C.panel2} stroke={C.amber} strokeWidth={5} /></g>
            </svg>
            <div style={{position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", fontSize: 56, fontWeight: 800, opacity: r(0.65, 0.7)}}>Keep asking why</div>
            <div style={{position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center", fontSize: 42, fontWeight: 600, color: C.mute, opacity: r(0.88, 0.93)}}>In branches, not one straight line</div>
          </Card>
        </Fade>
      </Abs>
    </Stage>
  );
};
