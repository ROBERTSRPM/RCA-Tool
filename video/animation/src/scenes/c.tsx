import React from "react";
import {Abs, C, Card, Check, clamp01, Cross, dash, Fade, FONT, Full, GIn, H1, IO, LIN, lerp, money, MONO, OUT, Pill, Pump, rand, Stage, useScene} from "../lib";

/* ---------------- S9 ---------------- */
const Phase: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
  const {r} = useScene();
  return <div style={{position: "absolute", inset: 0, opacity: r(a, a + 0.03) * (1 - r(b - 0.03, b, IO))}}>{children}</div>;
};
export const S09: React.FC = () => {
  const {r} = useScene();
  const bands = [
    {name: "Physical", color: C.steel, n: 4, y: 200},
    {name: "Human", color: C.amber, n: 4, y: 385},
    {name: "System / latent", color: C.teal, n: 6, y: 570},
  ];
  const theory = new Set(["0-3", "2-5"]);
  return (
    <Stage>
      <Phase a={0.0} b={0.54}>
        <Abs x={0} y={40} w={1920} style={{textAlign: "center"}}>
          <H1 style={{fontSize: 64}}>
            <Fade a={0.02} b={0.07} c={0.31} d={0.34} style={{position: "absolute", width: "100%"}}>Three layers of cause</Fade>
            <Fade a={0.34} b={0.39} y={10} style={{position: "absolute", width: "100%"}}><span style={{color: C.amber}}>4</span>  Check every cause against evidence</Fade>
          </H1>
        </Abs>
        <Full>
          {bands.map((b, bi) => {
            const t = r(0.05 + bi * 0.07, 0.10 + bi * 0.07);
            return (
              <g key={bi} opacity={t}>
                <rect x={80} y={b.y} width={1760} height={170} rx={20} fill={b.color} fillOpacity={0.1} stroke={b.color} strokeWidth={3} />
                <text x={120} y={b.y + 100} fontSize={46} fontWeight={800} fill={b.color} fontFamily={FONT}>{b.name}</text>
                {[...Array(b.n)].map((_, i) => {
                  const nw = 170, gap = 26;
                  const x0 = 1800 - (b.n * nw + (b.n - 1) * gap);
                  const x = x0 + i * (nw + gap), y = b.y + 40;
                  const isTheory = theory.has(`${bi}-${i}`);
                  const st = 0.35 + (bi * 6 + i) * 0.008;
                  const k = r(st, st + 0.03, OUT);
                  return (
                    <g key={i} opacity={r(0.07 + bi * 0.07 + i * 0.01, 0.11 + bi * 0.07 + i * 0.01)}>
                      <rect x={x} y={y} width={nw} height={90} rx={14} fill={C.panel2} stroke={isTheory && k > 0.5 ? "#6F8197" : b.color} strokeWidth={4} />
                      <rect x={x + 22} y={y + 30} width={nw - 44} height={12} rx={6} fill={C.line} />
                      <rect x={x + 22} y={y + 52} width={nw - 80} height={12} rx={6} fill={C.line} />
                      {k > 0 && (
                        <g transform={`translate(${x + nw - 22} ${y - 2}) scale(${lerp(2, 1, k)})`} opacity={k}>
                          <circle r={30} fill={isTheory ? "#2A3646" : "#0F3A2B"} stroke={isTheory ? "#8A9BB0" : C.green} strokeWidth={4} />
                          <g transform="translate(-17 -17)">{isTheory ? <Cross size={34} color="#8A9BB0" sw={7} t={k} /> : <Check size={34} sw={7} t={k} />}</g>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </Full>
        <Abs x={80} y={790} w={1300}>
          <Fade a={0.24} b={0.29} c={0.31} d={0.34} y={10} style={{position: "absolute", width: "100%"}}>
            <Card color={C.teal} style={{padding: "20px 34px", fontSize: 44, fontWeight: 700, textAlign: "center"}}><span style={{color: C.teal}}>Latent</span> = hidden weakness in procedures, standards, management</Card>
          </Fade>
          <Fade a={0.40} b={0.45} y={10} style={{position: "absolute", width: "100%", display: "flex", justifyContent: "center", gap: 90, fontSize: 48, fontWeight: 700}}>
            <div style={{display: "flex", alignItems: "center", gap: 18}}><Check size={52} /><span style={{color: C.green}}>Verified</span></div>
            <div style={{display: "flex", alignItems: "center", gap: 18}}><Cross size={52} color="#8A9BB0" /><span style={{color: "#8A9BB0"}}>Theory</span></div>
          </Fade>
        </Abs>
      </Phase>

      <Phase a={0.54} b={0.72}>
        <Abs x={0} y={60} w={1920} style={{textAlign: "center"}}><H1 style={{fontSize: 64}}><Fade a={0.55} b={0.6}><span style={{color: C.amber}}>5</span>  Actions with an owner and a date</Fade></H1></Abs>
        <Abs x={260} y={260} w={1400}>
          <Fade a={0.57} b={0.62} y={50}>
            <Card color={C.amber} style={{padding: 0, overflow: "hidden"}}>
              <div style={{display: "flex", background: C.panel2, height: 96, alignItems: "center", fontSize: 46, fontWeight: 800, color: C.amber}}>
                <div style={{flex: 3, paddingLeft: 40}}>Action</div><div style={{flex: 2}}>Owner</div><div style={{flex: 1.2}}>Date</div>
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{display: "flex", height: 120, alignItems: "center", borderTop: `2px solid ${C.line}`, opacity: r(0.60 + i * 0.03, 0.64 + i * 0.03)}}>
                  <div style={{flex: 3, paddingLeft: 40}}><div style={{height: 22, borderRadius: 11, background: C.line, width: `${88 - i * 14}%`}} /></div>
                  <div style={{flex: 2}}><div style={{height: 22, borderRadius: 11, background: C.line, width: "62%"}} /></div>
                  <div style={{flex: 1.2}}><div style={{height: 22, borderRadius: 11, background: C.amber, opacity: 0.8, width: "58%"}} /></div>
                </div>
              ))}
            </Card>
          </Fade>
        </Abs>
      </Phase>

      <Phase a={0.72} b={0.9}>
        <Abs x={0} y={60} w={1920} style={{textAlign: "center"}}><H1 style={{fontSize: 64}}><Fade a={0.73} b={0.78}><span style={{color: C.amber}}>6</span>  Check that it worked</Fade></H1></Abs>
        <Full>
          <GIn a={0.74} b={0.79} y={30}>
            <g transform="translate(250 250)">
              <rect width={360} height={380} rx={26} fill={C.panel} stroke={C.text} strokeWidth={6} />
              <path d="M0 110 H360" stroke={C.text} strokeWidth={6} />
              <rect width={360} height={110} rx={26} fill={C.amber} />
              <rect y={80} width={360} height={30} fill={C.amber} />
              <line x1={90} y1={-26} x2={90} y2={30} stroke={C.text} strokeWidth={14} strokeLinecap="round" />
              <line x1={270} y1={-26} x2={270} y2={30} stroke={C.text} strokeWidth={14} strokeLinecap="round" />
              {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => <rect key={row + "-" + col} x={36 + col * 78} y={140 + row * 56} width={46} height={30} rx={7} fill={C.line} />))}
            </g>
          </GIn>
          <g opacity={r(0.76, 0.81)}>
            <line x1={800} y1={680} x2={1360} y2={680} stroke={C.mute} strokeWidth={4} />
            <line x1={800} y1={680} x2={800} y2={240} stroke={C.mute} strokeWidth={4} />
            <text x={780} y={690} textAnchor="end" fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>0</text>
            <text x={1080} y={750} textAnchor="middle" fontSize={44} fill={C.text} fontFamily={FONT} fontWeight={700}>Failures per quarter</text>
            {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={880 + i * 95} y1={675} x2={880 + i * 95} y2={690} stroke={C.mute} strokeWidth={3} />)}
          </g>
          {(() => {
            const vals = [400, 330, 250, 150, 70, 0];
            const pts = vals.map((v, i) => [880 + i * 95, 680 - v]);
            const d = pts.map((q, i) => (i ? "L" : "M") + q[0] + " " + q[1]).join(" ");
            const t = r(0.80, 0.9, IO);
            return (
              <g>
                <path d={d} fill="none" stroke={C.green} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" {...dash(820, t)} />
                {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={13} fill={C.green} opacity={r(0.8 + i * 0.016, 0.82 + i * 0.016)} />)}
              </g>
            );
          })()}
        </Full>
      </Phase>

      <Abs x={0} y={340} w={1920} style={{textAlign: "center"}}>
        <Fade a={0.91} b={0.96} s={0.94}><div style={{fontSize: 130, fontWeight: 800, letterSpacing: -3}}>Worked example</div></Fade>
        <Fade a={0.94} b={0.99} y={14} style={{marginTop: 40}}><Pill color={C.amber} style={{fontSize: 44, height: 80, padding: "0 40px"}}>ILLUSTRATIVE NUMBERS</Pill></Fade>
      </Abs>
    </Stage>
  );
};

/* ---------------- S10 ---------------- */
export const S10: React.FC = () => {
  const {r, frame} = useScene();
  const run = 1 - r(0.54, 0.56, LIN);
  const dying = r(0.54, 0.62);
  const flash = r(0.54, 0.66, LIN) > 0 && r(0.54, 0.66, LIN) < 1 ? (Math.floor(frame / 6) % 2 === 0 ? 1 : 0.35) : 1;
  const stopped = r(0.55, 0.6);
  const pumpCol = stopped > 0 ? C.red : C.steel;
  const phase2 = r(0.30, 0.35) * (1 - r(0.6, 0.66, IO));
  const phase3 = r(0.64, 0.7);
  const particles = (x0: number, x1: number, off: number) =>
    [...Array(9)].map((_, i) => {
      const L = x1 - x0;
      const pos = (((i / 9) + (frame * 0.0045 * run) + off) % 1);
      return <circle key={i} cx={x0 + pos * L} cy={414} r={9} fill={stopped > 0.5 ? "#6F8197" : "#C9A66B"} opacity={r(0.06, 0.12)} />;
    });
  const months = [
    {m: 1, k: "seal"}, {m: 3, k: "bearing"}, {m: 5, k: "seal"}, {m: 7, k: "bearing"}, {m: 9, k: "seal"}, {m: 11, k: "bearing"},
  ];
  return (
    <Stage badge>
      <Full>
        <g opacity={lerp(1, 0.9, phase3)}>
          {/* tank */}
          <GIn a={0.02} b={0.08} y={0}>
            <rect x={120} y={270} width={280} height={260} rx={14} fill={C.panel} stroke={C.steel} strokeWidth={6} />
            <rect x={126} y={350} width={268} height={174} rx={10} fill={stopped > 0.5 ? "#555e6a" : "#8C6D3F"} opacity={0.85} />
          </GIn>
          <GIn a={0.03} b={0.08} y={0}><text x={260} y={590} textAnchor="middle" fontSize={44} fontWeight={700} fill={C.text} fontFamily={FONT}>Slurry tank</text></GIn>
          <g opacity={r(0.06, 0.12)}>
            <line x1={400} y1={414} x2={740} y2={414} stroke={C.steel} strokeWidth={14} />
            <line x1={1040} y1={414} x2={1380} y2={414} stroke={C.steel} strokeWidth={14} />
          </g>
          {particles(410, 740, 0)}{particles(1040, 1380, 0.3)}
          {/* process line */}
          <GIn a={0.08} b={0.14} y={0}>
            <rect x={1380} y={300} width={420} height={230} rx={18} fill={stopped > 0.5 ? "#1D2631" : "#182D3A"} stroke={stopped > 0.5 ? "#566577" : C.teal} strokeWidth={6} />
            <path d="M1420 480 L1500 360 L1560 440 L1640 330 L1760 480" fill="none" stroke={stopped > 0.5 ? "#566577" : C.teal} strokeWidth={8} strokeLinejoin="round" />
          </GIn>
          <GIn a={0.09} b={0.14} y={0}><text x={1590} y={590} textAnchor="middle" fontSize={44} fontWeight={700} fill={stopped > 0.5 ? "#8091A6" : C.text} fontFamily={FONT}>Process line</text></GIn>
          <g opacity={r(0.58, 0.63)}><text x={1590} y={248} textAnchor="middle" fontSize={44} fontWeight={800} fill={C.red} fontFamily={FONT}>LINE STOPPED</text></g>
          <GIn a={0.05} b={0.1} y={0}>
            <g transform="translate(740 270)" opacity={flash}>
              <foreignObject width={300} height={220} style={{overflow: "visible"}}><Pump w={300} color={pumpCol} fill={stopped > 0.5 ? "#33191E" : "#1B2838"} /></foreignObject>
            </g>
            <text x={890} y={238} textAnchor="middle" fontSize={56} fontWeight={800} fill={stopped > 0.5 ? C.red : C.amber} fontFamily={MONO}>P-101</text>
          </GIn>
          <g opacity={r(0.15, 0.2) * (1 - r(0.30, 0.34))}>
            <text x={480} y={680} textAnchor="middle" fontSize={44} fill={C.mute} fontFamily={FONT} fontWeight={600}>No standby pump</text>
            <text x={1280} y={680} textAnchor="middle" fontSize={44} fill={C.mute} fontFamily={FONT} fontWeight={600}>No buffer tank</text>
          </g>
        </g>
        {/* callout */}
        <g opacity={phase2}>
          <path d="M880 440 L880 560 L600 640" fill="none" stroke={C.amber} strokeWidth={5} strokeDasharray="8 8" />
          <circle cx={880} cy={436} r={10} fill={C.amber} />
          <rect x={80} y={630} width={1300} height={400} rx={22} fill={C.panel} stroke={C.amber} strokeWidth={3} />
          <rect x={440} y={660} width={80} height={350} fill="#4E6078" />
          <rect x={520} y={660} width={320} height={350} fill="#6B5232" opacity={0.7} />
          {[...Array(26)].map((_, i) => <circle key={i} cx={535 + rand(i) * 290} cy={672 + rand(i + 30) * 326} r={5 + rand(i + 9) * 5} fill="#B79A6A" opacity={0.7} />)}
          <rect x={120} y={810} width={720} height={64} fill="#AAB6C6" />
          <rect x={410} y={778} width={42} height={128} rx={5} fill={C.amber} />
          <rect x={452} y={778} width={30} height={128} rx={5} fill="#F7D28A" />
          <text x={110} y={730} fontSize={38} fontWeight={800} fill={C.amber} fontFamily={FONT}>Mechanical seal</text>
          <path d="M300 745 L420 785" stroke={C.amber} strokeWidth={5} />
          <text x={140} y={940} fontSize={38} fontWeight={600} fill={C.mute} fontFamily={FONT}>Shaft</text>
          <text x={560} y={720} fontSize={38} fontWeight={600} fill="#E5D3B3" fontFamily={FONT}>Slurry</text>
          <text x={440} y={1000} fontSize={30} fill="none" />
        </g>
      </Full>
      <Abs x={880} y={668} w={470}>
        <Fade a={0.34} b={0.40} c={0.6} d={0.65} y={14}>
          <div style={{fontSize: 40, fontWeight: 600, lineHeight: 1.28}}>
            <span style={{color: C.amber, fontWeight: 800}}>Mechanical seal:</span> keeps the slurry inside the pump where the shaft passes through the casing.
          </div>
        </Fade>
      </Abs>
      {/* 12 month strip */}
      <Full>
        <g opacity={phase3}>
          <text x={120} y={680} fontSize={52} fontWeight={700} fill={C.text} fontFamily={FONT}>Twelve months</text>
          <text x={1320} y={680} textAnchor="end" fontSize={52} fontWeight={700} fill={C.red} fontFamily={FONT}>6 failures</text>
          <line x1={120} y1={850} x2={1320} y2={850} stroke={C.line} strokeWidth={8} strokeLinecap="round" />
          {[...Array(13)].map((_, i) => <line key={i} x1={120 + i * 100} y1={838} x2={120 + i * 100} y2={862} stroke={C.line} strokeWidth={4} />)}
          {months.map((mm, i) => {
            const x = 120 + (mm.m - 0.5) * 100;
            const t0 = 0.70 + i * 0.035;
            const t = r(t0, t0 + 0.03, OUT);
            const col = mm.k === "seal" ? C.red : C.pink;
            return (
              <g key={i} opacity={t} transform={`translate(${x} ${850 - (1 - t) * 60})`}>
                {mm.k === "seal" ? <circle r={30} fill={col} /> : <rect x={-26} y={-26} width={52} height={52} fill={col} transform="rotate(45)" />}
                <text y={-52} textAnchor="middle" fontSize={44} fontWeight={800} fill={C.text} fontFamily={FONT}>14 h</text>
              </g>
            );
          })}
          <g opacity={r(0.9, 0.95)}>
            <circle cx={140} cy={970} r={20} fill={C.red} /><text x={175} y={984} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>3 seal failures</text>
            <rect x={660} y={952} width={36} height={36} fill={C.pink} transform="rotate(45 678 970)" /><text x={710} y={984} fontSize={40} fill={C.mute} fontFamily={FONT} fontWeight={600}>3 bearing failures</text>
          </g>
        </g>
      </Full>
    </Stage>
  );
};

/* ---------------- S11 ---------------- */
const Line: React.FC<{y: number; a: number; parts: [string, string][]; hot?: boolean}> = ({y, a, parts, hot}) => (
  <Abs x={60} y={y} w={1260}>
    <Fade a={a} b={a + 0.04} x={-40} y={0}>
      <div style={{fontFamily: MONO, fontSize: 54, fontWeight: 700, height: 128, display: "flex", alignItems: "center", borderBottom: `3px solid ${hot ? C.amber : C.line}`, background: hot ? "rgba(245,165,36,0.12)" : "transparent", paddingLeft: 20, whiteSpace: "pre"}}>
        {parts.map(([t, c], i) => <span key={i} style={{color: c}}>{t}</span>)}
      </div>
    </Fade>
  </Abs>
);
export const S11: React.FC = () => {
  const {r} = useScene();
  const chips = ["Line rate 120 t/h", "Margin $18/t", "Repair $9,500"];
  return (
    <Stage badge>
      <Abs x={60} y={96} w={1300} style={{display: "flex", gap: 20}}>
        {chips.map((t, i) => <Fade key={t} a={0.02 + i * 0.03} b={0.06 + i * 0.03} y={14}><Pill color={C.steel} style={{fontSize: 40, fontWeight: 700, letterSpacing: 0, height: 72}}>{t}</Pill></Fade>)}
      </Abs>
      <Line y={230} a={0.12} parts={[["14 h × 120 t/h ", C.mute], ["= 1,680 t", C.text]]} />
      <Line y={378} a={0.28} parts={[["1,680 t × $18/t ", C.mute], ["= $30,240 ", C.text], ["lost margin", C.mute]]} />
      <Line y={526} a={0.42} parts={[["+ $9,500 ", C.text], ["repair", C.mute]]} />
      <Line y={674} a={0.54} parts={[["= $39,740 ", C.text], ["per failure", C.mute]]} />
      <Line y={822} a={0.68} hot parts={[["× 6 failures = ", C.mute], ["$238,440 ", C.amber], ["per year", C.amber]]} />
      <Abs x={1370} y={230} w={500} h={720}>
        <Fade a={0.78} b={0.84} x={40} y={0} style={{height: "100%"}}>
          <Card color={C.amber} style={{padding: "36px 36px", height: "100%", boxSizing: "border-box"}}>
            <div style={{fontSize: 36, letterSpacing: 4, fontWeight: 800, color: C.amber, marginBottom: 30}}>PROBLEM STATEMENT</div>
            {["P-101 slurry pump:", "6 failures", "in 12 months,", "84 hours lost,", "$238,440", "per year."].map((t, i) => (
              <Fade key={t} a={0.80 + i * 0.025} b={0.84 + i * 0.025} y={10}><div style={{fontSize: 50, fontWeight: i >= 4 ? 800 : 600, color: i >= 4 ? C.amber : C.text, lineHeight: 1.25, marginBottom: i === 0 || i === 2 || i === 3 ? 24 : 0}}>{t}</div></Fade>
            ))}
          </Card>
        </Fade>
      </Abs>
    </Stage>
  );
};

/* ---------------- S12 ---------------- */
const Tile: React.FC<{x: number; y: number; w: number; h: number; a: number; tag: string; col: string; children: React.ReactNode}> = ({x, y, w, h, a, tag, col, children}) => (
  <Abs x={x} y={y} w={w} h={h}>
    <Fade a={a} b={a + 0.05} y={40} style={{height: "100%"}}>
      <Card color={col} style={{height: "100%", position: "relative", overflow: "hidden"}}>
        <svg width={w} height={h - 84} viewBox={`0 0 ${w} ${h - 84}`}>{children}</svg>
        <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 84, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 800, color: col, borderTop: `2px solid ${C.line}`, textAlign: "center", padding: "0 10px"}}>{tag}</div>
      </Card>
    </Fade>
  </Abs>
);
const ringPath = (R: number, rr: number) => `M${-R} 0 a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0 M${-rr} 0 a${rr} ${rr} 0 1 1 ${2 * rr} 0 a${rr} ${rr} 0 1 1 ${-2 * rr} 0`;
export const S12: React.FC = () => {
  const {r} = useScene();
  // pump curve dot at 60% of BEP flow
  const P0 = [40, 250], P1 = [210, -30], P2 = [380, 250];
  const B = (t: number) => [(1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
  const tDot = 0.5 - 0.5 * 0.6 * 1; // x=40+340t -> flow fraction t; BEP at t=0.5; 60% => 0.3
  const dot = B(0.3);
  const wear: string[] = [];
  for (let a = -70; a <= 110; a += 10) wear.push(`${10 + 81 * Math.cos((a * Math.PI) / 180)},${81 * Math.sin((a * Math.PI) / 180)}`);
  return (
    <Stage badge>
      <Tile x={80} y={120} w={560} h={470} a={0.06} tag="Ran dry" col={C.red}>
        <g transform="translate(280 190) scale(1.15)">
          <path d={ringPath(112, 56)} fillRule="evenodd" fill="#8E9AAB" stroke="#C5CFDB" strokeWidth={4} />
          {[72, 84, 96].map((rad) => <circle key={rad} r={rad} fill="none" stroke="#505C6C" strokeWidth={3} strokeDasharray={`${rad * 3} ${rad * 1.2}`} />)}
          {[20, 100, 170, 235, 300].map((ang, i) => {
            const a = (ang * Math.PI) / 180;
            const pts = [0, 0.25, 0.5, 0.75, 1].map((t, k) => { const rd = lerp(58, 110, t); const aa = a + (k % 2 ? 0.06 : -0.04); return `${Math.cos(aa) * rd},${Math.sin(aa) * rd}`; });
            return <polyline key={i} points={pts.join(" ")} fill="none" stroke={C.red} strokeWidth={5} strokeLinejoin="round" />;
          })}
        </g>
      </Tile>
      <Tile x={680} y={120} w={560} h={470} a={0.20} tag="Misalignment" col={C.amber}>
        <g transform="translate(280 190) scale(1.15)">
          <path d={ringPath(112, 60)} fillRule="evenodd" fill="#AEB9C7" stroke="#D9E1EA" strokeWidth={4} />
          <circle r={81} fill="none" stroke="#7B889A" strokeWidth={16} />
          <polyline points={wear.join(" ")} fill="none" stroke="#1E252F" strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </Tile>
      <Tile x={1280} y={120} w={560} h={470} a={0.32} tag="Water and solids" col={C.steel}>
        <g transform="translate(190 40) scale(1.1)">
          <defs><clipPath id="vial"><path d="M30 10 H130 V40 H118 V222 Q118 270 80 270 Q42 270 42 222 V40 H30 Z" /></clipPath></defs>
          <g clipPath="url(#vial)">
            <rect x={0} y={0} width={160} height={300} fill="#1B2838" />
            <rect x={0} y={90} width={160} height={190} fill="#8A6C41" opacity={0.92} />
            <rect x={0} y={90} width={160} height={46} fill="#7FB2D6" opacity={0.75} />
            {[...Array(24)].map((_, i) => <circle key={i} cx={50 + rand(i) * 60} cy={140 + rand(i + 40) * 120} r={3 + rand(i + 7) * 5} fill="#3D2F1B" opacity={0.8} />)}
          </g>
          <path d="M30 10 H130 V40 H118 V222 Q118 270 80 270 Q42 270 42 222 V40 H30 Z" fill="none" stroke={C.text} strokeWidth={5} strokeLinejoin="round" />
        </g>
      </Tile>
      <Tile x={80} y={620} w={860} h={400} a={0.46} tag="About 60% of best efficiency flow" col={C.green}>
        <g transform="translate(60 14)">
          <line x1={20} y1={250} x2={420} y2={250} stroke={C.mute} strokeWidth={4} />
          <line x1={40} y1={20} x2={40} y2={250} stroke={C.mute} strokeWidth={4} />
          <path d={`M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`} fill="none" stroke={C.steel} strokeWidth={8} />
          <line x1={210} y1={40} x2={210} y2={250} stroke={C.green} strokeWidth={5} strokeDasharray="12 9" />
          <text x={226} y={60} fontSize={40} fontWeight={800} fill={C.green} fontFamily={FONT}>BEP</text>
          <circle cx={dot[0]} cy={dot[1]} r={16} fill={C.red} stroke="#fff" strokeWidth={4} opacity={r(0.5, 0.55)} />
          <text x={dot[0]} y={dot[1] - 30} textAnchor="middle" fontSize={36} fontWeight={700} fill={C.red} fontFamily={FONT} opacity={r(0.52, 0.57)}>pump</text>
        </g>
        <g transform="translate(560 20)">
          <text x={0} y={90} fontSize={36} fill={C.mute} fontFamily={FONT}>Flow</text>
          <text x={0} y={140} fontSize={36} fill={C.mute} fontFamily={FONT}>trend from</text>
          <text x={0} y={190} fontSize={36} fill={C.mute} fontFamily={FONT}>control system</text>
        </g>
      </Tile>
      <Tile x={980} y={620} w={860} h={400} a={0.76} tag="4 of 6 rebuilds: no record" col={C.red}>
        <text x={430} y={52} textAnchor="middle" fontSize={38} fontWeight={700} fill={C.mute} fontFamily={FONT}>Alignment record</text>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const col = Math.floor(i / 3), row = i % 3;
          const x = 40 + col * 420, y = 80 + row * 78;
          const has = i === 0 || i === 3;
          const t = r(0.78 + i * 0.02, 0.81 + i * 0.02);
          return (
            <g key={i} opacity={t}>
              <text x={x} y={y + 46} fontSize={38} fontWeight={600} fill={C.text} fontFamily={FONT}>Rebuild {i + 1}</text>
              {has ? (
                <g transform={`translate(${x + 260} ${y + 6})`}><rect width={110} height={56} rx={10} fill="#0F3A2B" stroke={C.green} strokeWidth={4} /><g transform="translate(31 4)"><Check size={48} sw={8} /></g></g>
              ) : (
                <rect x={x + 260} y={y + 6} width={110} height={56} rx={10} fill="none" stroke={C.red} strokeWidth={4} strokeDasharray="10 8" />
              )}
            </g>
          );
        })}
      </Tile>
      {[{x: 80, a: 0.46, t: "Control system", s: "Where does the pump run?"}, {x: 980, a: 0.76, t: "Maintenance system", s: "What was recorded?"}].map((p) => (
        <Abs key={p.t} x={p.x} y={620} w={860} h={400}>
          <div style={{height: "100%", boxSizing: "border-box", border: `3px dashed ${C.line}`, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: r(0.02, 0.08) * (1 - r(p.a, p.a + 0.04))}}>
            <div style={{fontSize: 60, fontWeight: 800, color: C.mute}}>{p.t}</div>
            <div style={{fontSize: 40, fontWeight: 600, color: "#6F8197"}}>{p.s}</div>
          </div>
        </Abs>
      ))}
      <Abs x={0} y={1030} w={1920} style={{textAlign: "center", fontSize: 38, color: C.mute, fontWeight: 600}}>
        <Fade a={0.62} b={0.67} y={8}><span style={{color: C.green, fontWeight: 800}}>BEP</span> = best efficiency point</Fade>
      </Abs>
    </Stage>
  );
};
