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
  const {r, frame} = useScene();
  const clockO = r(0.0, 0.03) * (1 - r(0.19, 0.25, IO));
  const flick = frame < 60 ? (rand(frame) > 0.45 ? 1 : 0.2) : 1;
  const cols = [260, 700, 1140, 1580];
  const stamps = [0.27, 0.38, 0.46, 0.52];
  const mid = r(0.3, 0.84);
  const outA = 1 - r(0.80, 0.86, IO);
  return (
    <Stage>
      <Full>
        <g opacity={clockO} transform={`translate(0 ${-30 * r(0.19, 0.25, IO)})`}>
          <rect x={560} y={150} width={800} height={340} rx={30} fill={C.panel} stroke={C.line} strokeWidth={3} />
          <text x={960} y={400} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={250} fill={C.amber} opacity={flick}>02:14</text>
          <g transform="translate(960 730)"><Phone t={clockO} /></g>
        </g>
        <g opacity={outA}>
          {cols.map((cx, i) => {
            const s = stamps[i];
            const k = r(s, s + 0.03, BACK);
            const thud = Math.sin(clamp01(r(s + 0.015, s + 0.05, LIN)) * Math.PI) * 14;
            return (
              <g key={i}>
                <g transform={`translate(${cx - 150} ${100 + thud})`} opacity={r(s - 0.06, s - 0.02)}>
                  <foreignObject width={300} height={220}><Pump w={300} /></foreignObject>
                </g>
                <g transform={`translate(${cx} 215) scale(${lerp(2.6, 1, k)}) rotate(${lerp(-30, 0, k)})`} opacity={k}>
                  <foreignObject x={-70} y={-70} width={140} height={140}><Wrench size={140} /></foreignObject>
                </g>
                <text x={cx} y={372} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={48} fill={C.text} opacity={r(s + 0.02, s + 0.05)}>Repair #{i + 1}</text>
                {[0, 1, 2, 3, 4, 5].map((j) => {
                  const st = j === 0 ? s + 0.02 : 0.57 + (j - 1) * 0.02 + i * 0.006;
                  const q = r(st, st + 0.035, OUT);
                  const rot = (rand(i * 9 + j) - 0.5) * 3;
                  return (
                    <g key={j} opacity={q} transform={`translate(${cx} ${1000 - (j + 1) * 98 - (1 - q) * 260}) rotate(${rot})`}>
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
        <Fade a={0.86} b={0.92} style={{fontSize: 128, fontWeight: 800, letterSpacing: -3}}>Same failure. Again.</Fade>
        <Fade a={0.92} b={0.97} style={{fontSize: 68, fontWeight: 700, color: C.amber, marginTop: 30}}>How to stop it</Fade>
      </Abs>
    </Stage>
  );
};

/* ---------------- Story title card (S2, S7) ---------------- */
export const StoryCard: React.FC = () => {
  const {r, p} = useScene();
  const zoom = 1 + p * 0.05;
  return (
    <Stage>
      <div style={{position: "absolute", inset: 0, transform: `scale(${zoom})`}}>
        <Abs x={560} y={190} style={{opacity: 0.1 * r(0, 0.1)}}><Pump w={800} color={C.text} /></Abs>
        <Abs x={0} y={400} w={1920} style={{textAlign: "center"}}>
          <Fade a={0.02} b={0.10} y={20} style={{fontSize: 40, letterSpacing: 10, color: C.amber, fontWeight: 700}}>OWNER STORY</Fade>
          <Fade a={0.06} b={0.16} y={30} style={{fontSize: 124, fontWeight: 800, letterSpacing: -3, marginTop: 24}}>From the plant floor</Fade>
        </Abs>
        <Full>
          <line x1={760} y1={660} x2={1160} y2={660} stroke={C.amber} strokeWidth={6} strokeLinecap="round" {...dash(400, r(0.1, 0.2))} />
        </Full>
      </div>
    </Stage>
  );
};
export const S02 = StoryCard;
export const S07 = StoryCard;

/* ---------------- S3 ---------------- */
const Typed: React.FC<{text: string; a: number; b: number}> = ({text, a, b}) => {
  const {r, frame} = useScene();
  const n = Math.floor(r(a, b, LIN) * text.length);
  const cur = r(a, b + 0.06, LIN) < 1 && Math.floor(frame / 8) % 2 === 0;
  return <>{text.slice(0, n)}<span style={{color: C.amber, opacity: cur ? 1 : 0}}>|</span></>;
};
export const S03: React.FC = () => {
  const {r} = useScene();
  const xs = [260, 570, 880, 1190, 1500];
  const cols = [C.amber, C.steel, C.steel, C.steel, C.teal];
  const lensX = lerp(260, 1500, r(0.56, 0.72, IO));
  const phaseA = 1 - r(0.40, 0.45, IO);
  return (
    <Stage>
      <Abs x={0} y={70} w={1920} style={{textAlign: "center"}}>
        <Fade a={0.01} b={0.07} style={{fontSize: 84, fontWeight: 800, letterSpacing: -2}}>Root Cause Analysis <span style={{color: C.amber}}>(RCA)</span></Fade>
      </Abs>
      <div style={{opacity: phaseA}}>
        <Abs x={0} y={290} w={1920} style={{textAlign: "center", fontSize: 88, fontWeight: 700}}>
          <Typed text="Why did this really happen?" a={0.08} b={0.20} />
        </Abs>
        <Abs x={0} y={470} w={1920} style={{textAlign: "center", fontSize: 72, fontWeight: 600}}>
          <Fade a={0.2} b={0.24}>
            <span style={{color: C.mute}}>Not what </span>
            <span style={{position: "relative", color: C.mute}}>broke
              <span style={{position: "absolute", left: 0, top: "52%", height: 6, width: `${r(0.25, 0.29) * 100}%`, background: C.mute}} />
            </span>
          </Fade>
        </Abs>
        <Abs x={0} y={590} w={1920} style={{textAlign: "center", fontSize: 76, fontWeight: 800, color: C.teal}}>
          <Fade a={0.29} b={0.35}>Why was it able to break?</Fade>
        </Abs>
      </div>
      <Full>
        {xs.slice(1).map((x, i) => (
          <line key={i} x1={xs[i] + 52} y1={400} x2={x - 52} y2={400} stroke={C.line} strokeWidth={6} {...dash(206, r(0.46 + i * 0.045, 0.50 + i * 0.045))} />
        ))}
        {xs.map((x, i) => (
          <GIn key={i} a={0.46 + i * 0.045 - 0.02} b={0.48 + i * 0.045 + 0.02} y={0} s={0.4}>
            <circle cx={x} cy={400} r={52} fill={C.panel} stroke={cols[i]} strokeWidth={6} />
            {i > 0 && i < 4 && <text x={x} y={414} textAnchor="middle" fontSize={40} fontWeight={800} fill={cols[i]} fontFamily={FONT}>?</text>}
            {i === 0 && <circle cx={x} cy={400} r={20} fill={cols[i]} />}
            {i === 4 && <circle cx={x} cy={400} r={20} fill={cols[i]} />}
          </GIn>
        ))}
        <GIn a={0.50} b={0.55} y={0}><text x={260} y={510} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.amber} fontFamily={FONT}>Failure</text></GIn>
        <GIn a={0.70} b={0.75} y={0}><text x={1500} y={510} textAnchor="middle" fontSize={48} fontWeight={800} fill={C.teal} fontFamily={FONT}>Root cause</text></GIn>
        <g opacity={r(0.54, 0.57) * (1 - r(0.73, 0.76))} transform={`translate(${lensX} 400)`}>
          <circle r={70} fill="rgba(255,255,255,0.06)" stroke={C.text} strokeWidth={7} />
          <line x1={50} y1={50} x2={105} y2={105} stroke={C.text} strokeWidth={14} strokeLinecap="round" />
        </g>
        <path d="M1500 460 C1500 560 1420 570 1420 640" fill="none" stroke={C.teal} strokeWidth={7} strokeLinecap="round" {...dash(260, r(0.76, 0.82))} />
        <path d="M1396 616 L1420 648 L1444 616" fill="none" stroke={C.teal} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={r(0.80, 0.83)} />
      </Full>
      <Abs x={1020} y={660} w={800}>
        <Fade a={0.81} b={0.87} y={30}>
          <Card color={C.teal} style={{padding: "30px 36px", fontSize: 46, fontWeight: 700, lineHeight: 1.25, minHeight: 130, display: "flex", alignItems: "center"}}>
            Change to plant, procedure or way of working
          </Card>
        </Fade>
      </Abs>
      <Abs x={0} y={890} w={1920} style={{textAlign: "center", fontSize: 76, fontWeight: 800}}>
        <Fade a={0.90} b={0.96}>No change = <span style={{color: C.amber}}>no analysis</span></Fade>
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
const NotCard: React.FC<{i: number; text: string; children: React.ReactNode}> = ({i, text, children}) => {
  const start = [0.04, 0.30, 0.60][i];
  return (
    <Abs x={80 + i * 600} y={200} w={560} h={810}>
      <Fade a={start} b={start + 0.06} y={90} style={{height: "100%"}}>
        <Card color={C.red} style={{height: "100%", position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", left: 24, top: 24}}>
            <svg width={72} height={72} viewBox="0 0 72 72"><circle cx={36} cy={36} r={32} fill="rgba(255,90,95,0.15)" stroke={C.red} strokeWidth={4} /><path d="M24 24 L48 48 M48 24 L24 48" stroke={C.red} strokeWidth={7} strokeLinecap="round" /></svg>
          </div>
          <div style={{position: "absolute", right: 28, top: 36, fontSize: 40, letterSpacing: 6, fontWeight: 800, color: C.red}}>NOT</div>
          <svg width={560} height={400} viewBox="0 0 560 400" style={{position: "absolute", top: 100, left: 0}}>{children}</svg>
          <div style={{position: "absolute", left: 36, right: 36, top: 520, fontSize: 48, fontWeight: 800, lineHeight: 1.2}}>{text}</div>
        </Card>
      </Fade>
    </Abs>
  );
};
export const S04: React.FC = () => {
  const {r} = useScene();
  const swap = r(0.66, 0.76, IO);
  return (
    <Stage>
      <Abs x={0} y={50} w={1920} style={{textAlign: "center"}}><Fade a={0.0} b={0.05}><H1>What RCA is <span style={{color: C.red}}>not</span></H1></Fade></Abs>
      <NotCard i={0} text="Not a blame hunt">
        <g>
          <circle cx={130} cy={150} r={34} fill={C.steel} />
          <path d="M70 330 Q70 210 130 205 Q190 210 190 330 Z" fill={C.steel} />
          <line x1={175} y1={235} x2={340} y2={205} stroke={C.steel} strokeWidth={22} strokeLinecap="round" />
          <path d="M335 175 L395 205 L335 240 Z" fill={C.steel} />
          <g opacity={r(0.14, 0.20)}>
            <circle cx={460} cy={170} r={32} fill="none" stroke={C.amber} strokeWidth={6} strokeDasharray="10 8" />
            <path d="M405 330 Q405 220 460 215 Q515 220 515 330" fill="none" stroke={C.amber} strokeWidth={6} strokeDasharray="10 8" />
          </g>
        </g>
      </NotCard>
      <NotCard i={1} text="Not stopping at the first cause">
        <g>
          {[0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1={340} y1={50 + k * 70} x2={510} y2={50 + k * 70} stroke={k === 4 ? C.amber : C.line} strokeWidth={k === 4 ? 14 : 9} strokeLinecap="round" />
          ))}
          <line x1={340} y1={20} x2={340} y2={370} stroke={C.mute} strokeWidth={9} strokeLinecap="round" />
          <line x1={510} y1={20} x2={510} y2={370} stroke={C.mute} strokeWidth={9} strokeLinecap="round" />
        </g>
        <GIn a={0.40} b={0.46} y={20}>
          <rect x={20} y={110} width={280} height={140} rx={18} fill={C.panel2} stroke={C.amber} strokeWidth={4} />
          <path d="M240 250 L270 290 L200 250 Z" fill={C.panel2} stroke={C.amber} strokeWidth={4} />
          <text x={160} y={168} textAnchor="middle" fontSize={40} fontWeight={700} fill={C.text} fontFamily={FONT}>Bearing</text>
          <text x={160} y={216} textAnchor="middle" fontSize={40} fontWeight={700} fill={C.text} fontFamily={FONT}>overheated</text>
        </GIn>
        <GIn a={0.47} b={0.52} y={0}>
          <text x={20} y={345} fontSize={40} fontWeight={800} fill={C.amber} fontFamily={FONT}>start here</text>
          <path d="M215 330 L325 300" stroke={C.amber} strokeWidth={5} strokeLinecap="round" />
        </GIn>
      </NotCard>
      <NotCard i={2} text="Not replace and walk away">
        <g transform={`translate(${lerp(280, 40, swap) } 140)`} opacity={1 - swap}><Bearing color={C.mute} cracked /></g>
        <g transform={`translate(${lerp(640, 280, swap)} 140)`} opacity={swap}><Bearing color={C.green} /></g>
        <GIn a={0.78} b={0.84} y={20}>
          <g transform="translate(150 315)">
            <rect x={-40} y={-24} width={80} height={14} rx={4} fill={C.amber} />
            <rect x={-26} y={-2} width={80} height={14} rx={4} fill={C.amber} />
          </g>
          <path d="M390 288 C390 288 362 322 362 338 A28 28 0 0 0 418 338 C418 322 390 288 390 288 Z" fill={C.amber} />
          <text x={280} y={392} textAnchor="middle" fontSize={38} fontWeight={700} fill={C.amber} fontFamily={FONT}>Conditions remain</text>
        </GIn>
      </NotCard>
    </Stage>
  );
};
