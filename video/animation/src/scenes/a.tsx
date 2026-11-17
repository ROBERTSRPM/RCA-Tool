import React from "react";
import {Abs, BACK, C, Card, Check, Cross, dash, Fade, Full, FONT, GIn, H1, IO, LIN, MONO, OUT, Pump, rand, Stage, useScene, Wrench, lerp, clamp01} from "../lib";

/* ---------------- S1 ---------------- */
const Phone: React.FC<{t: number}> = ({t}) => {
  const {frame} = useScene();
  const rings = [0, 1, 2].map((i) => {
    const k = ((frame / 45 + i / 3) % 1);
    return <circle key={i} cx={0} cy={0} r={70 + k * 110} fill="none" stroke={C.red} strokeWidth={5} opacity={(1 - k) * 0.8 * t} />;
  });
  const shake = Math.sin(frame * 1.7) * 5 * (frame % 45 < 30 ? 1 : 0);
  return (
    <g opacity={t}>
      {rings}
      <circle r={74} fill={C.red} />
      <g transform={`rotate(${shake})`}>
        <path d="M-40 -8 Q0 -46 40 -8" fill="none" stroke="#fff" strokeWidth={17} strokeLinecap="round" />
        <rect x={-46} y={-6} width={22} height={38} rx={9} fill="#fff" transform="rotate(14 -35 12)" />
        <rect x={24} y={-6} width={22} height={38} rx={9} fill="#fff" transform="rotate(-14 35 12)" />
      </g>
    </g>
  );
};
const Invoice: React.FC<{hue?: string}> = ({hue = C.line}) => (
  <g>
    <rect x={-190} y={0} width={380} height={96} rx={10} fill={C.panel2} stroke={hue} strokeWidth={3} />
    <circle cx={-140} cy={48} r={26} fill={C.amber} />
    <text x={-140} y={60} textAnchor="middle" fontSize={36} fontWeight={800} fill="#10161e" fontFamily={FONT}>$</text>
    <rect x={-90} y={26} width={220} height={12} rx={6} fill={C.line} />
    <rect x={-90} y={54} width={150} height={12} rx={6} fill={C.line} />
  </g>
);
export const S01: React.FC = () => {
  const {r, frame, q, d, dur} = useScene();
  const call = q("call"), clockOut = q("first");
  const clockO = r(call, call + d(0.5)) * (1 - r(clockOut, clockOut + d(0.7), IO));
  const callF = call * dur;
  const flick = frame >= callF && frame < callF + 60 ? (rand(frame) > 0.45 ? 1 : 0.2) : 1;
  const cols = [260, 700, 1140, 1580];
  // each repair stamp lands on its spoken phrase: same pump, same gearbox, same conveyor, more times than we care to count
  const stamps = [q("pump"), q("gearbox"), q("conveyor"), q("count")];
  const outA = 1 - r(q("video"), q("video", 0.7), IO);
  return (
    <Stage>
      <Full>
        <g opacity={clockO} transform={`translate(0 ${-30 * r(clockOut, clockOut + d(0.7), IO)})`}>
          <rect x={560} y={150} width={800} height={340} rx={30} fill={C.panel} stroke={C.line} strokeWidth={3} />
          <text x={960} y={400} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={250} fill={C.amber} opacity={flick}>02:14</text>
          <g transform="translate(960 730)"><Phone t={clockO} /></g>
        </g>
        <g opacity={outA}>
          {cols.map((cx, i) => {
            const s = stamps[i];
            const k = r(s + d(0.25), s + d(0.7), BACK);
            const thud = Math.sin(clamp01(r(s + d(0.45), s + d(0.8), LIN)) * Math.PI) * 14;
            return (
              <g key={i}>
                <g transform={`translate(${cx - 150} ${100 + thud})`} opacity={r(s, s + d(0.3))}>
                  <foreignObject width={300} height={220}><Pump w={300} /></foreignObject>
                </g>
                <g transform={`translate(${cx} 215) scale(${lerp(2.6, 1, k)}) rotate(${lerp(-30, 0, k)})`} opacity={k}>
                  <foreignObject x={-70} y={-70} width={140} height={140}><Wrench size={140} /></foreignObject>
                </g>
                <text x={cx} y={372} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={48} fill={C.text} opacity={r(s + d(0.4), s + d(0.8))}>Repair #{i + 1}</text>
                {[0, 1, 2, 3, 4, 5].map((j) => {
                  // first invoice comes with the repair; the pile builds while "it is a bill ... and we keep paying it" is said
                  const st = j === 0 ? s + d(0.5) : q("bill", ((j - 1) * 4 + i) * 0.15);
                  const qq = r(st, st + d(0.5), OUT);
                  const rot = (rand(i * 9 + j) - 0.5) * 3;
                  return (
                    <g key={j} opacity={qq} transform={`translate(${cx} ${1000 - (j + 1) * 98 - (1 - qq) * 260}) rotate(${rot})`}>
                      <Invoice hue={j === 5 ? C.amber : C.line} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </Full>
      <Abs x={0} y={380} w={1920} style={{textAlign: "center"}}>
        <Fade a={q("video")} b={q("video", 0.7)} style={{fontSize: 128, fontWeight: 800, letterSpacing: -3}}>Same failure. Again.</Fade>
        <Fade a={q("find")} b={q("find", 0.7)} style={{fontSize: 64, fontWeight: 700, color: C.amber, marginTop: 30}}>Find the cause. Fix it. Prove it stays fixed.</Fade>
      </Abs>
    </Stage>
  );
};

/* ---------------- S2: presenter story (fallback card): the bucket conveyor ---------------- */
// Presenter is full screen for this scene; this animation is only a fallback. It follows the story order:
// conveyor feeds packaging -> failed 4 times in a year -> not enough spares -> salvaged buckets -> made to order, air freighted -> running is not fixing.
const BCX = 560, BTOP = 330, BBOT = 800, BR = 80; // bucket elevator geometry
const BH = BBOT - BTOP, BL = 2 * BH + 2 * Math.PI * BR;
const beltPoint = (s: number): [number, number, number] => {
  s = ((s % BL) + BL) % BL;
  if (s < BH) return [BCX + BR, BBOT - s, -90];
  s -= BH;
  if (s < Math.PI * BR) { const a = s / BR; return [BCX + BR * Math.cos(a), BTOP - BR * Math.sin(a), -90 - (a * 180) / Math.PI]; }
  s -= Math.PI * BR;
  if (s < BH) return [BCX - BR, BTOP + s, 90];
  s -= BH;
  const a = s / BR;
  return [BCX - BR * Math.cos(a), BBOT + BR * Math.sin(a), 90 - (a * 180) / Math.PI];
};
const NB = 16;
const StoryCard: React.FC = () => {
  const {r, frame, dur} = useScene();
  const run = Math.min(frame, 0.12 * dur) * 1.9 + Math.max(0, frame - 0.5 * dur) * 0.9;
  const failT = [0.14, 0.19, 0.24, 0.29];
  const fails = failT.filter((t) => r(t, t + 0.01, LIN) > 0).length;
  const stopped = r(0.12, 0.13, LIN) * (1 - r(0.5, 0.51, LIN));
  const salv = r(0.5, 0.6); // buckets stripped from damaged sets
  const plane = r(0.64, 0.80, IO);
  const finalO = r(0.90, 0.95);
  const cardIn = (a: number) => r(a, a + 0.05);
  const missing = new Set([3, 7, 11]);
  return (
    <Stage>
      <Abs x={80} y={70} w={1000}>
        <Fade a={0.01} b={0.06} y={16} style={{fontSize: 40, letterSpacing: 8, color: C.amber, fontWeight: 700}}>FROM THE PLANT FLOOR</Fade>
        <Fade a={0.03} b={0.09} y={20} style={{fontSize: 76, fontWeight: 800, letterSpacing: -2, marginTop: 6}}>The bucket conveyor</Fade>
      </Abs>
      <Full>
        <g opacity={r(0.02, 0.08)}>
          {/* floor and frame */}
          <line x1={120} y1={920} x2={1060} y2={920} stroke={C.line} strokeWidth={5} />
          <path d={`M${BCX - BR - 12} ${BTOP} V${BBOT} M${BCX + BR + 12} ${BTOP} V${BBOT}`} stroke={C.line} strokeWidth={3} opacity={0.5} />
          <rect x={BCX - BR - 30} y={BTOP - BR - 22} width={2 * BR + 60} height={BH + 2 * BR + 44} rx={BR + 30} fill="none" stroke={C.steel} strokeWidth={6} opacity={0.35} />
          <circle cx={BCX} cy={BTOP} r={BR - 22} fill="#1B2838" stroke={C.steel} strokeWidth={6} />
          <circle cx={BCX} cy={BBOT} r={BR - 22} fill="#1B2838" stroke={C.steel} strokeWidth={6} />
          <circle cx={BCX} cy={BTOP} r={10} fill={C.steel} /><circle cx={BCX} cy={BBOT} r={10} fill={C.steel} />
          <line x1={BCX - 90} y1={920} x2={BCX - 90} y2={BBOT + BR} stroke={C.line} strokeWidth={6} /><line x1={BCX + 90} y1={920} x2={BCX + 90} y2={BBOT + BR} stroke={C.line} strokeWidth={6} />
          {/* chute to packaging lines */}
          <path d={`M${BCX + 40} ${BTOP - BR - 6} L${BCX + 250} ${BTOP - BR + 60} H${BCX + 330}`} fill="none" stroke={C.steel} strokeWidth={8} strokeLinecap="round" />
          <rect x={870} y={BTOP - BR + 36} width={250} height={64} rx={10} fill={C.panel2} stroke={stopped > 0.5 ? C.red : C.teal} strokeWidth={4} />
          <text x={995} y={BTOP - BR + 78} textAnchor="middle" fontSize={32} fontWeight={700} fill={stopped > 0.5 ? C.red : C.text} fontFamily={FONT}>Packaging lines</text>
          <text x={995} y={BTOP - BR + 140} textAnchor="middle" fontSize={34} fontWeight={800} fill={C.red} fontFamily={FONT} opacity={stopped}>STOPPED</text>
        </g>
        {/* buckets */}
        <g opacity={r(0.03, 0.09)}>
          {[...Array(NB)].map((_, i) => {
            if (missing.has(i) && salv > 0) { /* stripped out */ }
            const [x, y, rot] = beltPoint(run + (i * BL) / NB);
            const gone = missing.has(i) && r(0.5, 0.54) > 0.5;
            const patched = !gone && (i % 4 === 1) && salv > 0.5;
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={gone ? 0.0 : 1}>
                <path d="M-6 -16 L26 -16 L20 18 L-6 18 Z" fill={patched ? C.amber : "#8FA9CC"} stroke={C.bg} strokeWidth={3} />
              </g>
            );
          })}
        </g>
        {/* failure marks, one per failure */}
        {failT.map((t, i) => {
          const k = r(t, t + 0.025, BACK);
          const [x, y] = beltPoint(run + (i * 5.3 * BL) / NB);
          const pos = [[BCX + BR, 560], [BCX - BR, 470], [BCX, BTOP - BR], [BCX + BR, 700]][i];
          return (
            <g key={i} transform={`translate(${pos[0] + (i % 2 ? -70 : 70)} ${pos[1]}) scale(${k})`} opacity={k}>
              <circle r={34} fill={C.red} />
              <text y={14} textAnchor="middle" fontSize={40} fontWeight={800} fill="#fff" fontFamily={FONT}>{i + 1}</text>
            </g>
          );
        })}
        {/* empty spares shelf */}
        <g opacity={r(0.34, 0.40)}>
          <line x1={120} y1={800} x2={330} y2={800} stroke={C.mute} strokeWidth={6} />
          {[0, 1, 2].map((i) => <path key={i} d={`M${140 + i * 62} 760 H${190 + i * 62} L${182 + i * 62} 796 H${140 + i * 62} Z`} fill="none" stroke={C.mute} strokeWidth={3} strokeDasharray="7 6" />)}
          <text x={225} y={850} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.mute} fontFamily={FONT}>Spares: not enough</text>
        </g>
        {/* air freight */}
        <g opacity={r(0.64, 0.68) * (1 - r(0.84, 0.88))} transform={`translate(${lerp(880, 1900, plane)} ${lerp(150, 100, plane)})`}>
          <path d="M0 0 L90 -14 L60 -50 L78 -50 L128 -14 L190 -10 Q214 0 190 10 L128 14 L78 50 L60 50 L90 14 Z" fill={C.text} />
          <rect x={40} y={52} width={44} height={34} rx={4} fill={C.amber} />
        </g>
      </Full>
      {/* story cards */}
      <Abs x={1180} y={190} w={680}>
        {[
          {a: 0.12, big: "4", t: "failures in 12 months", col: C.red, dots: true},
          {a: 0.36, big: "", t: "Not enough spares on site", col: C.amber},
          {a: 0.62, big: "", t: "Made to order, air freighted", col: C.steel},
        ].map((c, i) => (
          <div key={i} style={{opacity: cardIn(c.a), transform: `translateX(${(1 - cardIn(c.a)) * 50}px)`, marginBottom: 28}}>
            <Card color={c.col} style={{padding: "20px 30px", height: 190, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 30}}>
              {c.big && <div style={{fontFamily: MONO, fontSize: 100, fontWeight: 800, color: c.col, width: 90, textAlign: "center"}}>{fails}</div>}
              <div style={{fontSize: c.big ? 46 : 46, fontWeight: 800, lineHeight: 1.12}}>
                {c.t}
                {i === 0 && <div style={{display: "flex", gap: 12, marginTop: 12}}>{failT.map((t, k) => <div key={k} style={{width: 46, height: 14, borderRadius: 7, background: r(t, t + 0.01, LIN) > 0 ? C.red : C.line}} />)}</div>}
                {i === 2 && <div style={{fontSize: 36, color: C.mute, fontWeight: 600, marginTop: 8}}>More cost. More waiting.</div>}
              </div>
            </Card>
          </div>
        ))}
        <Fade a={0.78} b={0.84} y={14} style={{fontSize: 42, fontWeight: 700, color: C.amber, lineHeight: 1.2}}>Running on salvaged parts, exposed to the next failure</Fade>
      </Abs>
      <Abs x={0} y={970} w={1920} style={{textAlign: "center", opacity: finalO, fontSize: 56, fontWeight: 800}}>
        Getting it running is <span style={{color: C.amber}}>not the same as fixing it</span>
      </Abs>
    </Stage>
  );
};
export const S02 = StoryCard;

/* ---------------- S3 ---------------- */
const Typed: React.FC<{text: string; a: number; b: number}> = ({text, a, b}) => {
  const {r, frame} = useScene();
  const n = Math.floor(r(a, b, LIN) * text.length);
  const cur = r(a, a + 0.001, LIN) > 0 && r(a, b + 0.06, LIN) < 1 && Math.floor(frame / 8) % 2 === 0;
  return <>{text.slice(0, n)}<span style={{color: C.amber, opacity: cur ? 1 : 0}}>|</span></>;
};
export const S03: React.FC = () => {
  const {r, q, d} = useScene();
  const xs = [260, 610, 960, 1310, 1660];
  const cols = [C.amber, C.steel, C.steel, C.steel, C.teal];
  // chain nodes follow the words: "we trace a failure | back through | the chain | of causes | something we can change"
  const nodeT = [q("trace"), q("through"), q("chain"), q("causes"), q("change")];
  const lensA = q("reach"), lensB = q("change");
  const lensX = lerp(260, 1660, r(lensA, lensB, IO));
  const phaseA = 1 - r(q("trace"), q("trace", 0.6), IO);
  return (
    <Stage>
      <Abs x={0} y={70} w={1920} style={{textAlign: "center"}}>
        <Fade a={q("title")} b={q("title", 0.7)} style={{fontSize: 84, fontWeight: 800, letterSpacing: -2}}>Root Cause Analysis <span style={{color: C.amber}}>(RCA)</span></Fade>
      </Abs>
      <div style={{opacity: phaseA}}>
        <Abs x={0} y={250} w={1920} style={{textAlign: "center", fontSize: 88, fontWeight: 700}}>
          <Typed text="Why did this really happen?" a={q("why")} b={q("why", 1.8)} />
        </Abs>
        <Abs x={0} y={440} w={1920} style={{textAlign: "center", fontSize: 72, fontWeight: 600}}>
          <Fade a={q("notwhat")} b={q("notwhat", 0.5)}>
            <span style={{color: C.mute}}>Not what </span>
            <span style={{position: "relative", color: C.mute}}>broke
              <span style={{position: "absolute", left: 0, top: "52%", height: 6, width: `${r(q("broke"), q("broke", 0.4)) * 100}%`, background: C.mute}} />
            </span>
          </Fade>
        </Abs>
        <Abs x={0} y={570} w={1920} style={{textAlign: "center", fontSize: 76, fontWeight: 800, color: C.teal}}>
          <Fade a={q("able")} b={q("able", 0.6)}>Why was it able to break?</Fade>
        </Abs>
      </div>
      <Full>
        {xs.slice(1).map((x, i) => (
          <line key={i} x1={xs[i] + 52} y1={540} x2={x - 52} y2={540} stroke={C.line} strokeWidth={6} {...dash(246, r(nodeT[i + 1], nodeT[i + 1] + d(0.45)))} />
        ))}
        {xs.map((x, i) => (
          <GIn key={i} a={nodeT[i] + d(i ? 0.1 : 0)} b={nodeT[i] + d(i ? 0.5 : 0.4)} y={0} s={0.4}>
            <circle cx={x} cy={540} r={52} fill={C.panel} stroke={cols[i]} strokeWidth={6} />
            {i > 0 && i < 4 && <text x={x} y={554} textAnchor="middle" fontSize={40} fontWeight={800} fill={cols[i]} fontFamily={FONT}>?</text>}
            {i === 0 && <circle cx={x} cy={540} r={20} fill={cols[i]} />}
            {i === 4 && <circle cx={x} cy={540} r={20} fill={cols[i]} />}
          </GIn>
        ))}
        <GIn a={q("trace", 0.2)} b={q("trace", 0.7)} y={0}><text x={260} y={460} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.amber} fontFamily={FONT}>Failure</text></GIn>
        <GIn a={q("change", 0.3)} b={q("change", 0.8)} y={0}><text x={1660} y={460} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.teal} fontFamily={FONT}>Root cause</text></GIn>
        <g opacity={r(lensA, lensA + d(0.3)) * (1 - r(lensB + d(0.2), lensB + d(0.7)))} transform={`translate(${lensX} 540)`}>
          <circle r={70} fill="rgba(255,255,255,0.06)" stroke={C.text} strokeWidth={7} />
          <line x1={50} y1={50} x2={105} y2={105} stroke={C.text} strokeWidth={14} strokeLinecap="round" />
        </g>
        <path d="M1660 605 C1660 670 1500 660 1500 722" fill="none" stroke={C.teal} strokeWidth={7} strokeLinecap="round" {...dash(340, r(q("arrow"), q("arrow", 0.8)))} />
        <path d="M1476 694 L1500 726 L1524 694" fill="none" stroke={C.teal} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={r(q("arrow", 0.6), q("arrow", 0.9))} />
      </Full>
      <Abs x={210} y={740} w={1500}>
        <Fade a={q("card")} b={q("card", 0.6)} y={30}>
          <Card color={C.teal} style={{padding: "30px 36px", fontSize: 54, fontWeight: 700, lineHeight: 1.25, minHeight: 130, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center"}}>
            Change to plant, procedure or way of working
          </Card>
        </Fade>
      </Abs>
      <Abs x={0} y={930} w={1920} style={{textAlign: "center", fontSize: 92, fontWeight: 800}}>
        <Fade a={q("nochange")} b={q("nochange", 0.6)}>No change = <span style={{color: C.amber}}>no analysis</span></Fade>
      </Abs>
    </Stage>
  );
};

/* ---------------- S4 ---------------- */
const Bearing: React.FC<{color: string; cracked?: boolean}> = ({color, cracked}) => (
  <g>
    <circle r={92} fill="#1B2838" stroke={color} strokeWidth={7} />
    <circle r={48} fill={C.bg} stroke={color} strokeWidth={7} />
    {[...Array(8)].map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return <circle key={i} cx={Math.cos(a) * 70} cy={Math.sin(a) * 70} r={11} fill={color} />;
    })}
    {cracked && <path d="M60 -70 L40 -30 L62 -10 L38 24" fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" />}
  </g>
);
const NotCard: React.FC<{i: number; a: number; text: string; children: React.ReactNode}> = ({i, a, text, children}) => {
  const {d} = useScene();
  return (
    <Abs x={80 + i * 600} y={190} w={560} h={560}>
      <Fade a={a} b={a + d(0.7)} y={90} style={{height: "100%"}}>
        <Card color={C.red} style={{height: "100%", position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", left: 24, top: 24}}>
            <svg width={72} height={72} viewBox="0 0 72 72"><circle cx={36} cy={36} r={32} fill="rgba(255,90,95,0.15)" stroke={C.red} strokeWidth={4} /><path d="M24 24 L48 48 M48 24 L24 48" stroke={C.red} strokeWidth={7} strokeLinecap="round" /></svg>
          </div>
          <div style={{position: "absolute", right: 28, top: 36, fontSize: 40, letterSpacing: 6, fontWeight: 800, color: C.red}}>NOT</div>
          <svg width={560} height={340} viewBox="0 0 560 400" style={{position: "absolute", top: 76, left: 0}}>{children}</svg>
          <div style={{position: "absolute", left: 36, right: 36, top: 440, fontSize: 46, fontWeight: 800, lineHeight: 1.15}}>{text}</div>
        </Card>
      </Fade>
    </Abs>
  );
};
export const S04: React.FC = () => {
  const {r, q, d} = useScene();
  const swap = r(q("swap"), q("swap", 1.2), IO);
  return (
    <Stage>
      <Abs x={0} y={60} w={1920} style={{textAlign: "center"}}><Fade a={q("title")} b={q("title", 0.6)}><H1 style={{fontSize: 80}}>What RCA is <span style={{color: C.red}}>not</span></H1></Fade></Abs>
      {/* caption strip across the full width */}
      <Abs x={80} y={790} w={1760} h={200}>
        {[
          {a: q("cap1"), c: q("card1"), t: <>Blame stops people sharing facts, and <span style={{color: C.amber}}>facts are all we have</span></>},
          {a: q("cap2"), c: q("card2"), t: <>Overheated is <span style={{color: C.amber}}>where the investigation starts</span></>},
          {a: q("cap3"), c: 0, t: <>A new bearing treats the symptom. <span style={{color: C.amber}}>The conditions are still there.</span></>},
        ].map((qq, i) => (
          <Fade key={i} a={qq.a} b={qq.a + d(0.6)} c={i < 2 ? qq.c : undefined} d={i < 2 ? qq.c + d(0.4) : undefined} y={14} style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 52, fontWeight: 700, lineHeight: 1.2}}><div>{qq.t}</div></Fade>
        ))}
      </Abs>
      <NotCard i={0} a={q("blame")} text="Not a blame hunt">
        <g>
          <circle cx={130} cy={150} r={34} fill={C.steel} />
          <path d="M70 330 Q70 210 130 205 Q190 210 190 330 Z" fill={C.steel} />
          <line x1={175} y1={235} x2={340} y2={205} stroke={C.steel} strokeWidth={22} strokeLinecap="round" />
          <path d="M335 175 L395 205 L335 240 Z" fill={C.steel} />
          <g opacity={r(q("ghost"), q("ghost", 0.6))}>
            <circle cx={460} cy={170} r={32} fill="none" stroke={C.amber} strokeWidth={6} strokeDasharray="10 8" />
            <path d="M405 330 Q405 220 460 215 Q515 220 515 330" fill="none" stroke={C.amber} strokeWidth={6} strokeDasharray="10 8" />
          </g>
        </g>
      </NotCard>
      <NotCard i={1} a={q("card1")} text="Not stopping at the first cause">
        <g>
          {[0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1={340} y1={50 + k * 70} x2={510} y2={50 + k * 70} stroke={k === 4 ? C.amber : C.line} strokeWidth={k === 4 ? 14 : 9} strokeLinecap="round" />
          ))}
          <line x1={340} y1={20} x2={340} y2={370} stroke={C.mute} strokeWidth={9} strokeLinecap="round" />
          <line x1={510} y1={20} x2={510} y2={370} stroke={C.mute} strokeWidth={9} strokeLinecap="round" />
        </g>
        <GIn a={q("bearing")} b={q("bearing", 0.6)} y={20}>
          <rect x={20} y={110} width={280} height={140} rx={18} fill={C.panel2} stroke={C.amber} strokeWidth={4} />
          <path d="M240 250 L270 290 L200 250 Z" fill={C.panel2} stroke={C.amber} strokeWidth={4} />
          <text x={160} y={168} textAnchor="middle" fontSize={40} fontWeight={700} fill={C.text} fontFamily={FONT}>Bearing</text>
          <text x={160} y={216} textAnchor="middle" fontSize={40} fontWeight={700} fill={C.text} fontFamily={FONT}>overheated</text>
        </GIn>
        <GIn a={q("starthere")} b={q("starthere", 0.6)} y={0}>
          <text x={20} y={345} fontSize={40} fontWeight={800} fill={C.amber} fontFamily={FONT}>start here</text>
          <path d="M215 330 L325 300" stroke={C.amber} strokeWidth={5} strokeLinecap="round" />
        </GIn>
      </NotCard>
      <NotCard i={2} a={q("card2")} text="Not replace and walk away">
        <g transform={`translate(${lerp(280, 40, swap) } 140)`} opacity={1 - swap}><Bearing color={C.mute} cracked /></g>
        <g transform={`translate(${lerp(640, 280, swap)} 140)`} opacity={swap}><Bearing color={C.green} /></g>
        <GIn a={q("cond")} b={q("cond", 0.7)} y={20}>
          <g transform="translate(150 272)">
            <rect x={-40} y={-24} width={80} height={14} rx={4} fill={C.amber} />
            <rect x={-26} y={-2} width={80} height={14} rx={4} fill={C.amber} />
          </g>
          <path d="M390 250 C390 250 362 284 362 300 A28 28 0 0 0 418 300 C418 284 390 250 390 250 Z" fill={C.amber} />
          <text x={280} y={378} textAnchor="middle" fontSize={38} fontWeight={700} fill={C.amber} fontFamily={FONT}>Conditions remain</text>
        </GIn>
      </NotCard>
    </Stage>
  );
};
