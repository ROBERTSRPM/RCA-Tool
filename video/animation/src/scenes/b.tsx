import React from "react";
import {Abs, C, Card, Check, clamp01, dash, Fade, FONT, FactoryShape, Full, GIn, H1, IO, LIN, lerp, OUT, rand, Stage, useScene, BACK} from "../lib";

/* ---------------- S5 ---------------- */
const LoopNode: React.FC<{x: number; y: number; t: string; a: number}> = ({x, y, t, a}) => (
  <Abs x={x} y={y} w={380} h={140}>
    <Fade a={a} y={20} style={{height: "100%"}}>
      <div style={{height: "100%", background: C.panel2, border: `3px solid ${C.amber}`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 44, fontWeight: 700, lineHeight: 1.15, padding: "0 20px"}}>{t}</div>
    </Fade>
  </Abs>
);
const Bar: React.FC<{x: number; h: number; color: string; t: number; base: number}> = ({x, h, color, t, base}) => (
  <rect x={x} y={base - h * t} width={170} height={h * t} rx={10} fill={color} />
);
export const S05: React.FC = () => {
  const {r, frame, q, d, dur} = useScene();
  const ph1 = 1 - r(q("cost"), q("cost", 0.6), IO);
  const spinF = q("nextf", 0.6) * dur;
  const spin = frame > spinF ? (((frame - spinF) * 0.008) % 1) : 0;
  const pts = [[240, 320], [700, 320], [700, 720], [240, 720]];
  const seg = Math.floor(spin * 4), f = spin * 4 - seg;
  const A = pts[seg], B = pts[(seg + 1) % 4];
  const dot = [lerp(A[0], B[0], f), lerp(A[1], B[1], f)];
  const base = 770;
  const k = (a: number, b: number) => r(a, b);
  const grow = (key: string, off = 0) => k(q(key, off), q(key, off + 0.9));
  return (
    <Stage>
      <div style={{opacity: ph1, position: "absolute", inset: 0, transform: "translateY(70px)"}}>
        <Abs x={40} y={100} w={900} style={{textAlign: "center", fontSize: 52, fontWeight: 800, color: C.amber}}><Fade a={q("fire")}>Firefighting cycle</Fade></Abs>
        <Abs x={1000} y={100} w={880} style={{textAlign: "center", fontSize: 52, fontWeight: 800, color: C.green}}><Fade a={q("calm")}>Calm operation</Fade></Abs>
        <Full>
          <GIn a={q("fire")} b={q("fire", 0.7)} y={0}>
            <path d="M240 320 H700 V720 H240 Z" fill="none" stroke={C.amber} strokeWidth={7} strokeDasharray="2 0" opacity={0.75} />
            <path d="M458 296 L492 320 L458 344 Z" fill={C.amber} />
            <path d="M676 508 L700 542 L724 508 Z" fill={C.amber} />
            <path d="M482 696 L448 720 L482 744 Z" fill={C.amber} />
            <path d="M264 532 L240 498 L216 532 Z" fill={C.amber} />
          </GIn>
          <circle cx={dot[0]} cy={dot[1]} r={16} fill="#fff" opacity={r(q("nextf", 0.6), q("nextf", 0.9))} />
          <line x1={960} y1={170} x2={960} y2={900} stroke={C.line} strokeWidth={3} opacity={r(q("calm"), q("calm", 0.5))} />
          <line x1={1040} y1={540} x2={1800} y2={540} stroke={C.green} strokeWidth={16} strokeLinecap="round" {...dash(760, r(q("runs"), q("runs", 1.8)))} />
          <path d="M1760 490 L1830 540 L1760 590" fill="none" stroke={C.green} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={r(q("runs", 1.5), q("runs", 1.9))} />
        </Full>
        <LoopNode x={50} y={250} t="Breakdown" a={q("fire")} />
        <LoopNode x={510} y={250} t="Emergency work" a={q("emer")} />
        <LoopNode x={510} y={650} t="Planned work slips" a={q("slips")} />
        <LoopNode x={50} y={650} t="Next breakdown" a={q("nextf")} />
        <Abs x={1000} y={600} w={880} style={{textAlign: "center", fontSize: 56, fontWeight: 800}}><Fade a={q("without")}>Uninterrupted operation</Fade></Abs>
      </div>
      <Full>
        <g transform="translate(80 0)">
          <g opacity={r(q("cost"), q("cost", 0.5))}>
            <line x1={200} y1={base} x2={1560} y2={base} stroke={C.line} strokeWidth={4} />
            <text x={625} y={base + 66} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.text} fontFamily={FONT}>Cost per unit</text>
            <rect x={560} y={base + 110} width={30} height={30} rx={6} fill={C.amber} />
            <text x={604} y={base + 138} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>Firefighting</text>
          </g>
          <g opacity={r(q("falls"), q("falls", 0.5))}>
            <rect x={930} y={base + 110} width={30} height={30} rx={6} fill={C.green} />
            <text x={974} y={base + 138} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>Uninterrupted</text>
          </g>
          <g opacity={r(q("profit"), q("profit", 0.5))}>
            <text x={1345} y={base + 66} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.text} fontFamily={FONT}>Profit</text>
          </g>
          <Bar x={330} h={505} color={C.amber} t={grow("cost")} base={base} />
          <Bar x={540} h={345} color={C.green} t={grow("falls")} base={base} />
          <Bar x={1050} h={218} color={C.amber} t={grow("profit")} base={base} />
          <Bar x={1260} h={448} color={C.green} t={grow("rises")} base={base} />
        </g>
      </Full>
      <Abs x={0} y={110} w={1920} style={{textAlign: "center", fontSize: 60, fontWeight: 800}}><Fade a={q("fixed")}>Same fixed costs, <span style={{color: C.green}}>more good output</span></Fade></Abs>
      <Abs x={0} y={950} w={1920} style={{textAlign: "center", fontSize: 72, fontWeight: 800}}><Fade a={q("nonew")}>No new equipment. No major project.</Fade></Abs>
    </Stage>
  );
};

/* ---------------- S6 ---------------- */
const lostBlocks = [
  {d: 0, x: 0.03, w: 54}, {d: 0, x: 0.09, w: 90}, {d: 1, x: 0.04, w: 44}, {d: 2, x: 0.08, w: 70}, {d: 2, x: 0.1, w: 40},
  {d: 3, x: 0.02, w: 96}, {d: 4, x: 0.07, w: 50}, {d: 5, x: 0.05, w: 66}, {d: 6, x: 0.03, w: 44}, {d: 4, x: 0.09, w: 36},
];
export const S06: React.FC = () => {
  const {r, q, d} = useScene();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sx = 110, sw = 1700, dw = sw / 7;
  const ghostX = lerp(260, 900, r(q("hidden"), q("hidden", 1.8), IO));
  const fill = r(q("find"), q("find", 2.8), IO);
  const gY = 170, S = 1.3;
  const solidDone = fill > 0.98;
  return (
    <Stage>
      <Full>
        <defs>
          <clipPath id="gclip"><rect x={0} y={-20 + 280 * (1 - fill)} width={420} height={300 * fill + 10} /></clipPath>
        </defs>
        <g transform={`translate(${ghostX} ${gY}) scale(${S})`} opacity={r(q("hidden"), q("hidden", 0.7))}>
          <FactoryShape stroke={solidDone ? C.green : C.green} dashed={!solidDone} sw={5} />
          <g clipPath="url(#gclip)" opacity={0.85}><FactoryShape stroke="none" fill={C.green} /></g>
          <g opacity={fill > 0.3 ? 1 : 0}><FactoryShape stroke={C.green} sw={5} /></g>
        </g>
        <g transform={`translate(260 ${gY}) scale(${S})`} opacity={r(q("plant"), q("plant", 0.8))}>
          <FactoryShape stroke={C.teal} fill="#16303a" sw={5} />
        </g>
        <GIn a={q("plant", 0.2)} b={q("plant", 0.8)} y={0}><text x={600} y={590} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.teal} fontFamily={FONT}>Your plant</text></GIn>
        <GIn a={q("hidden", 1.2)} b={q("hidden", 1.8)} y={0}><text x={1160} y={590} textAnchor="middle" fontSize={44} fontWeight={800} fill={C.green} fontFamily={FONT}>The hidden plant</text></GIn>
        {/* weekly strip */}
        <g opacity={r(q("strip"), q("strip", 0.6))}>
          <text x={sx} y={668} fontSize={38} fill={C.mute} fontFamily={FONT} fontWeight={600}>One week of lost hours</text>
          <rect x={sx} y={690} width={sw} height={110} rx={14} fill={C.panel} stroke={C.line} strokeWidth={3} />
          {days.map((dd, i) => (
            <g key={dd}>
              {i > 0 && <line x1={sx + i * dw} y1={690} x2={sx + i * dw} y2={800} stroke={C.line} strokeWidth={2} />}
              <text x={sx + i * dw + dw / 2} y={846} textAnchor="middle" fontSize={36} fill={C.mute} fontFamily={FONT} fontWeight={600}>{dd}</text>
            </g>
          ))}
        </g>
        <g>
          {lostBlocks.map((b, i) => {
            const bx = sx + b.d * dw + b.x * dw * 3, by = 712;
            const appear = r(q("hour", i * 0.25), q("hour", i * 0.25 + 0.4));
            const fl = r(q("add", i * 0.2), q("add", i * 0.2 + 1.8), IO);
            const tx = 1000 + (rand(i + 3) * 380), ty = 330 + rand(i + 9) * 150;
            const x = lerp(bx, tx, fl), y = lerp(by, ty, fl) - Math.sin(fl * Math.PI) * 120;
            return <rect key={i} x={x} y={y} width={b.w * (1 - 0.5 * fl)} height={66 * (1 - 0.4 * fl)} rx={8} fill={C.amber} opacity={appear * (1 - r(q("add", i * 0.2 + 1.5), q("add", i * 0.2 + 2.1)))} />;
          })}
        </g>
      </Full>
      <Abs x={1500} y={190} w={380}>
        {[["Built", "built"], ["Staffed", "staffed"], ["Paid for", "paid"]].map(([t, key], i) => (
          <Fade key={t} a={q(key)} b={q(key, 0.5)} x={40} y={0} style={{marginBottom: 26}}>
            <div style={{display: "flex", alignItems: "center", gap: 20, height: 84, padding: "0 26px", background: C.panel, border: `2px solid ${C.green}`, borderRadius: 14, fontSize: 48, fontWeight: 700, width: 360}}>
              <Check size={44} sw={9} t={r(q(key, 0.2), q(key, 0.7))} />{t}
            </div>
          </Fade>
        ))}
      </Abs>
      <Abs x={400} y={930} w={1120}>
        <Fade a={q("capex")} y={10}>
          <Card color={C.amber} style={{padding: "16px 30px", fontSize: 44, fontWeight: 700, textAlign: "center"}}><span style={{color: C.amber}}>CAPEX</span> = money spent on new assets</Card>
        </Fade>
      </Abs>
      <Abs x={1500} y={560} w={380} style={{fontSize: 44, fontWeight: 700, color: C.green}}>
        <Fade a={q("fixing")} y={0}>Capacity you<br />already own</Fade>
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
  const {r, q, d} = useScene();
  const lit = [q("one"), q("two"), q("three")];
  const cardT = [[q("one"), q("two")], [q("two"), q("three")], [q("three"), 0]];
  const rows = ["What", "Where", "When", "Loss"];
  return (
    <Stage>
      <Abs x={60} y={110} w={840}>
        {steps.map((s, i) => {
          const on = i < 3 ? r(lit[i], lit[i] + d(0.4)) : 0;
          return (
            <Fade key={s} a={q("six", i * 0.12)} x={-30} y={0} style={{height: 142}}>
              <div style={{display: "flex", alignItems: "center", gap: 26, height: 120, padding: "0 22px", borderRadius: 18, background: on > 0.5 ? "rgba(245,165,36,0.12)" : "transparent", border: `2px solid ${on > 0.5 ? C.amber : "transparent"}`}}>
                <div style={{width: 72, height: 72, borderRadius: 36, border: `4px solid ${on > 0.5 ? C.amber : "#4A5B70"}`, background: on > 0.5 ? C.amber : "transparent", color: on > 0.5 ? "#10161e" : "#6B7D92", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800}}>{i + 1}</div>
                <div style={{fontSize: 50, fontWeight: 700, color: on > 0.5 ? C.text : "#6F8197"}}>{s}</div>
              </div>
            </Fade>
          );
        })}
      </Abs>
      {/* card 1 */}
      <Abs x={930} y={120} w={900} h={840}>
        <Fade a={cardT[0][0]} b={cardT[0][0] + d(0.6)} c={cardT[0][1]} d={cardT[0][1] + d(0.4)} x={50} y={0} style={{height: "100%"}}>
          <Card color={C.amber} style={{height: "100%", padding: 44}}>
            <div style={{fontSize: 56, fontWeight: 800, marginBottom: 40}}>Problem statement</div>
            {rows.map((t, i) => (
              <div key={t} style={{display: "flex", alignItems: "center", gap: 30, height: 120}}>
                <div style={{width: 170, fontSize: 46, fontWeight: 700, color: C.mute}}>{t}</div>
                <div style={{flex: 1}}>
                  <div style={{height: 26, borderRadius: 13, background: i === 3 ? C.amber : C.line, width: `${(i === 3 ? r(q("loss"), q("loss", 0.8)) : r(q("what", i * 0.4), q("what", i * 0.4 + 0.8))) * (i === 3 ? 95 : 70 + i * 8)}%`}} />
                  {i === 3 && <div style={{fontSize: 38, color: C.amber, marginTop: 12, opacity: r(q("hts"), q("hts", 0.5))}}>hours, tonnes, dollars</div>}
                </div>
              </div>
            ))}
          </Card>
        </Fade>
        {/* card 2 */}
        <Fade a={cardT[1][0]} b={cardT[1][0] + d(0.6)} c={cardT[1][1]} d={cardT[1][1] + d(0.4)} x={50} y={0} style={{position: "absolute", inset: 0}}>
          <Card color={C.amber} style={{height: "100%", padding: 44}}>
            <div style={{fontSize: 56, fontWeight: 800, marginBottom: 150}}>Evidence before opinions</div>
            <div style={{display: "flex", justifyContent: "space-between"}}>
              {["Photos", "Trends", "Logs", "Parts"].map((t, i) => (
                <Fade key={t} a={q(["photos", "trends", "logs", "parts"][i])} b={q(["photos", "trends", "logs", "parts"][i], 0.6)} y={-90} style={{textAlign: "center", width: 190}}>
                  <div style={{height: 300, borderRadius: 18, background: C.panel2, border: `2px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center"}}><div style={{transform: "scale(1.3)"}}><Icon k={i} /></div></div>
                  <div style={{fontSize: 44, fontWeight: 700, marginTop: 24}}>{t}</div>
                </Fade>
              ))}
            </div>
          </Card>
        </Fade>
        {/* card 3 */}
        <Fade a={cardT[2][0]} b={cardT[2][0] + d(0.6)} x={50} y={0} style={{position: "absolute", inset: 0}}>
          <Card color={C.amber} style={{height: "100%"}}>
            <svg width={896} height={836} viewBox="0 0 896 836" style={{position: "absolute", inset: 0}}>
              <g transform="translate(448 0) scale(1.06) translate(-448 40)">{[0, 1, 2].map((i) => {
                const cx = 448 + (i - 1) * 270;
                const t = r(q("asking", i * 0.35), q("asking", i * 0.35 + 0.6));
                return (
                  <g key={i} opacity={t}>
                    <path d={`M448 250 V300 H${cx} V330`} fill="none" stroke={C.line} strokeWidth={5} />
                    {[0, 1].map((j) => {
                      const lx = cx + (j - 0.5) * 130;
                      const tt = r(q("branches", i * 0.35 + j * 0.15), q("branches", i * 0.35 + j * 0.15 + 0.5));
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
              <g opacity={r(q("start"), q("start", 0.5))}><rect x={348} y={180} width={200} height={70} rx={14} fill={C.panel2} stroke={C.amber} strokeWidth={5} /></g></g>
            </svg>
            <div style={{position: "absolute", left: 0, right: 0, top: 50, textAlign: "center", fontSize: 60, fontWeight: 800, opacity: r(q("start"), q("start", 0.5))}}>Keep asking why</div>
            <div style={{position: "absolute", left: 0, right: 0, bottom: 40, textAlign: "center", fontSize: 46, fontWeight: 600, color: C.mute, opacity: r(q("straight"), q("straight", 0.5))}}>In branches, not one straight line</div>
          </Card>
        </Fade>
      </Abs>
    </Stage>
  );
};
