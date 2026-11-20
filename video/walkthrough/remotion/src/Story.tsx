import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, Easing} from "remotion";
import {C, FONT, fontFace} from "./tokens";

export const S1_DUR = 63.86, S2_DUR = 57.74;
const ease = Easing.inOut(Easing.cubic);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const fadeIO = (t: number, a: number, b: number, f = 0.5) => interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);
const useT = () => { const f = useCurrentFrame(); const {fps} = useVideoConfig(); return f / fps; };

// ---------- shared pieces ----------
const Stage = ({children, dark = false, t, a, b}: {children: React.ReactNode; dark?: boolean; t: number; a: number; b: number}) => (
  <AbsoluteFill style={{background: dark ? C.night : C.page, opacity: fadeIO(t, a, b, 0.6)}}>{children}</AbsoluteFill>
);
const Caption = ({text, dark}: {text: string; dark?: boolean}) => (
  <div style={{position: "absolute", left: 72, bottom: 64, fontFamily: FONT, fontSize: 30, color: dark ? "#cbd0d8" : C.muted}}>{text}</div>
);
const Tray = ({x, y, leak = false, slack = false, w = 150}: {x: number; y: number; leak?: boolean; slack?: boolean; w?: number}) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={0} y={0} width={w} height={w * 0.62} rx={10} fill="#fff" stroke={C.strong} strokeWidth={3} />
    <rect x={10} y={10} width={w - 20} height={w * 0.62 - 20} rx={6} fill="#f1f3f6" />
    <circle cx={w * 0.33} cy={w * 0.31} r={w * 0.15} fill="#e9d8b8" /><circle cx={w * 0.64} cy={w * 0.3} r={w * 0.14} fill="#c9a36a" />
    <path d={slack ? `M4 8 Q ${w / 2} ${-26} ${w - 4} 8` : `M4 6 L ${w - 4} 6`} stroke={leak ? C.red : "#9aa3b0"} strokeWidth={5} fill="none" strokeLinecap="round" />
  </g>
);

// ---------- scenes ----------
const Title = ({t}: {t: number}) => (
  <AbsoluteFill style={{background: C.page, alignItems: "center", justifyContent: "center", fontFamily: FONT, opacity: fadeIO(t, 0, 3.8, 0.5)}}>
    <div style={{fontSize: 78, fontWeight: 600, letterSpacing: -2, color: C.text, textAlign: "center", lineHeight: 1.1, maxWidth: 1400}}>
      It's 4 o'clock in the morning<br />on a Thursday
    </div>
    <div style={{width: 120, height: 5, background: C.accent, marginTop: 40, borderRadius: 3}} />
  </AbsoluteFill>
);

const Sealer = ({t}: {t: number}) => {
  const off = (t * 120) % 300;
  const press = Math.max(0, Math.sin((t * Math.PI) / 0.55)) ** 3;
  return (
    <Stage dark t={t} a={3.8} b={9.2}>
      <svg width={1920} height={1080}>
        <defs><radialGradient id="lamp" cx="50%" cy="0%" r="80%"><stop offset="0" stopColor="#fff7e6" stopOpacity="0.55" /><stop offset="1" stopColor="#fff7e6" stopOpacity="0" /></radialGradient></defs>
        <rect width={1920} height={1080} fill="url(#lamp)" />
        <rect x={0} y={650} width={1920} height={70} fill="#2d3644" /><rect x={0} y={720} width={1920} height={12} fill="#10141a" />
        {[...Array(9)].map((_, i) => <Tray key={i} x={-300 + i * 300 + off} y={560} />)}
        <g transform={`translate(740,${300 + press * 70})`}>
          <rect x={0} y={0} width={440} height={170} rx={14} fill="#3a4556" stroke="#586170" strokeWidth={4} />
          <rect x={30} y={170} width={380} height={60} rx={8} fill={C.accent} />
          <text x={220} y={100} textAnchor="middle" fontFamily={FONT} fontSize={44} fontWeight={600} fill="#e2e5ea">LINE 3 SEALER</text>
        </g>
        <rect x={640} y={90} width={640} height={26} rx={13} fill="#fff7e6" opacity={0.9} />
      </svg>
      <Caption dark text="Line 3 tray sealer, chilled ready meals. Illustrative example." />
    </Stage>
  );
};

const LeakTest = ({t}: {t: number}) => {
  const lt = t - 9;
  const leakShow = interpolate(t, [15.5, 17.5], [0, 1], clamp);
  return (
    <Stage t={t} a={9} b={19.2}>
      <svg width={1920} height={1080}>
        <rect x={140} y={760} width={1640} height={26} rx={6} fill="#cbd0d8" />
        {[0, 1, 2].map((i) => <g key={i} opacity={interpolate(lt, [0.8 + i * 0.7, 1.4 + i * 0.7], [0, 1], clamp)}><Tray x={220 + i * 190} y={640} w={150} leak={i < 2 && leakShow > 0.5} /></g>)}
        <text x={365} y={600} textAnchor="middle" fontFamily={FONT} fontSize={30} fill={C.muted}>3 packs from the end of the line</text>
        <g transform="translate(1000,330)">
          <rect x={0} y={0} width={620} height={420} rx={16} fill="#dbeafe" stroke="#93c5fd" strokeWidth={5} opacity={0.9} />
          <rect x={0} y={90} width={620} height={330} rx={16} fill="#bfdbfe" opacity={0.8} />
          <g transform={`translate(${260},${190 + 20 * Math.sin(lt * 2)})`}><Tray x={0} y={0} w={170} leak /></g>
          {[...Array(14)].map((_, i) => {
            const p = ((lt * 0.55 + i * 0.37) % 1);
            return <circle key={i} cx={290 + (i % 5) * 28 - 56 + Math.sin(lt * 3 + i) * 6} cy={300 - p * 260} r={6 + (i % 3) * 3} fill="#fff" opacity={leakShow * (1 - p * 0.7)} />;
          })}
        </g>
        <text x={1310} y={290} textAnchor="middle" fontFamily={FONT} fontSize={34} fontWeight={600} fill={C.text}>Leak tester</text>
        <g opacity={leakShow}><rect x={1130} y={800} width={360} height={80} rx={8} fill="#fff" stroke={C.red} strokeWidth={4} /><text x={1310} y={853} textAnchor="middle" fontFamily={FONT} fontSize={40} fontWeight={600} fill={C.red}>2 of 3 leak</text></g>
      </svg>
      <Caption text="Line 3 tray sealer, chilled ready meals. Illustrative example." />
    </Stage>
  );
};

const Holds = ({t}: {t: number}) => {
  const k = t - 19;
  return (
    <Stage t={t} a={19} b={28.6}>
      <svg width={1920} height={1080}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${260 + i * 520},560)`}>
            <rect x={0} y={150} width={380} height={34} fill="#b08a56" /><rect x={0} y={184} width={380} height={26} fill="#8a6a3a" />
            {[0, 1, 2].map((r) => [0, 1, 2].map((q) => <rect key={`${r}${q}`} x={q * 124 + 4} y={20 + r * 44 + 0} width={118} height={40} rx={4} fill="#e9eef5" stroke={C.strong} strokeWidth={3} />))}
            <g opacity={interpolate(k, [1.5 + i * 1.2, 2.2 + i * 1.2], [0, 1], clamp)} transform={`rotate(${Math.sin(k * 2 + i) * 4} 190 -40)`}>
              <rect x={95} y={-110} width={190} height={90} rx={8} fill={C.red} /><text x={190} y={-50} textAnchor="middle" fontFamily={FONT} fontSize={52} fontWeight={700} fill="#fff">HOLD</text>
            </g>
          </g>
        ))}
        <text x={960} y={260} textAnchor="middle" fontFamily={FONT} fontSize={90} fontWeight={700} fill={C.text} opacity={interpolate(t, [23.5, 24.6], [0, 1], clamp)}>About 6,000 packs on hold</text>
        <text x={960} y={330} textAnchor="middle" fontFamily={FONT} fontSize={36} fill={C.muted} opacity={interpolate(t, [24.2, 25.2], [0, 1], clamp)}>everything packed since the last good check</text>
      </svg>
    </Stage>
  );
};

const Phone = ({t}: {t: number}) => {
  const ring = (a: number) => { const k = t - a; return k > 0 && k < 3.2 ? Math.sin(k * 38) * 3 : 0; };
  const waves = (a: number) => { const k = t - a; return k > 0 && k < 3.2 ? (k * 1.4) % 1 : -1; };
  const Ph = ({x, label, a}: {x: number; label: string; a: number}) => (
    <g transform={`translate(${x},300) rotate(${ring(a)} 130 200)`}>
      {[0, 0.33, 0.66].map((o) => { const w = waves(a); const p = w < 0 ? -1 : (w + o) % 1; return p >= 0 ? <circle key={o} cx={130} cy={200} r={140 + p * 220} fill="none" stroke="#fde68a" strokeWidth={4} opacity={1 - p} /> : null; })}
      <rect x={0} y={0} width={260} height={400} rx={36} fill="#0b0f14" stroke="#586170" strokeWidth={6} />
      <rect x={16} y={16} width={228} height={368} rx={26} fill={t > a ? "#fff7e6" : "#10151c"} />
      {label.split(" ").map((w, i) => <text key={i} x={130} y={170 + i * 34} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={600} fill={t > a ? C.text : "#10151c"}>{w}</text>)}
      <text x={130} y={262} textAnchor="middle" fontFamily={FONT} fontSize={22} fill={t > a ? C.muted : "#10151c"}>incoming call</text>
    </g>
  );
  return (
    <Stage dark t={t} a={28.3} b={36.4}>
      <svg width={1920} height={1080}>
        <rect x={0} y={820} width={1920} height={260} fill="#1c222c" />
        <Ph x={520} label="Production manager" a={29.4} />
        <Ph x={1140} label="QA manager" a={34.0} />
      </svg>
    </Stage>
  );
};

const Slack = ({t}: {t: number}) => {
  const k = t - 36.4;
  return (
    <Stage t={t} a={36.4} b={45.0}>
      <svg width={1920} height={1080}>
        <g transform="translate(300,380)"><Tray x={0} y={0} w={460} slack /><text x={230} y={340} textAnchor="middle" fontFamily={FONT} fontSize={34} fill={C.muted}>Slack pack: loose lid</text></g>
        <text x={1240} y={400} textAnchor="middle" fontFamily={FONT} fontSize={44} fontWeight={600} fill={C.text}>Retailer complaint last month</text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} opacity={interpolate(t, [37 + i * 1.0, 37.6 + i * 1.0], [0, 1], clamp)}>
            <rect x={950 + i * 100} y={480} width={70} height={70} rx={10} fill={i === 5 ? C.red : "#fff"} stroke={i === 5 ? C.red : C.strong} strokeWidth={4} />
            <text x={985 + i * 100} y={532} textAnchor="middle" fontFamily={FONT} fontSize={40} fontWeight={700} fill={i === 5 ? "#fff" : C.muted}>{i + 1}</text>
          </g>
        ))}
        <text x={1240} y={640} textAnchor="middle" fontFamily={FONT} fontSize={40} fill={C.muted} opacity={interpolate(t, [42.2, 43.4], [0, 1], clamp)}>The 6th time this year</text>
      </svg>
    </Stage>
  );
};

const Meeting = ({t}: {t: number}) => (
  <Stage t={t} a={44.8} b={54.6}>
    <svg width={1920} height={1080}>
      <rect x={380} y={380} width={1160} height={300} rx={40} fill="#e9eef5" stroke={C.strong} strokeWidth={5} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={`t${i}`} x={450 + i * 220} y={300} width={140} height={60} rx={14} fill="#cbd0d8" />)}
      {[0, 1, 2, 3, 4].map((i) => <rect key={`b${i}`} x={450 + i * 220} y={700} width={140} height={60} rx={14} fill="#cbd0d8" />)}
      <rect x={1560} y={470} width={64} height={120} rx={14} fill={C.accent} />
      <g opacity={interpolate(t, [50.8, 52.0], [0, 1], clamp)}><text x={960} y={560} textAnchor="middle" fontFamily={FONT} fontSize={44} fontWeight={600} fill={C.text}>General manager: two questions</text></g>
      <text x={960} y={190} textAnchor="middle" fontFamily={FONT} fontSize={40} fill={C.muted}>The next morning, the meeting room</text>
    </svg>
  </Stage>
);

const Questions = ({t}: {t: number}) => (
  <AbsoluteFill style={{background: C.page, alignItems: "center", justifyContent: "center", fontFamily: FONT, opacity: interpolate(t, [54.4, 55.2], [0, 1], clamp)}}>
    <div style={{fontSize: 92, fontWeight: 700, letterSpacing: -2, color: C.text, textAlign: "center", lineHeight: 1.15, maxWidth: 1500}}>
      <div style={{opacity: interpolate(t, [54.6, 55.4], [0, 1], clamp)}}>Why does this keep happening?</div>
      <div style={{marginTop: 36, color: C.accent, opacity: interpolate(t, [58.6, 59.6], [0, 1], clamp)}}>What is it costing us?</div>
    </div>
  </AbsoluteFill>
);

export const Scene1 = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: C.page}}>
      <style>{fontFace}</style>
      <Title t={t} /><Sealer t={t} /><LeakTest t={t} /><Holds t={t} /><Phone t={t} /><Slack t={t} /><Meeting t={t} /><Questions t={t} />
    </AbsoluteFill>
  );
};

const Word = ({text, at, t, sub}: {text: string; at: number; t: number; sub?: string}) => {
  const o = interpolate(t, [at, at + 0.5], [0, 1], clamp), y = interpolate(t, [at, at + 0.6], [24, 0], {...clamp, easing: ease});
  return (
    <div style={{opacity: o, transform: `translateY(${y}px)`, display: "flex", alignItems: "baseline", gap: 24, marginBottom: 26}}>
      <div style={{width: 10, height: 64, background: C.accent, borderRadius: 4, alignSelf: "center"}} />
      <div style={{fontSize: 84, fontWeight: 700, letterSpacing: -2, color: C.text}}>{text}</div>
    </div>
  );
};
const Fact = ({label, value, at, t}: {label: string; value: string; at: number; t: number}) => (
  <div style={{opacity: interpolate(t, [at, at + 0.5], [0, 1], clamp), transform: `translateY(${interpolate(t, [at, at + 0.6], [16, 0], {...clamp, easing: ease})}px)`,
    display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${C.border}`, padding: "20px 0", width: 900}}>
    <span style={{fontSize: 36, color: C.muted}}>{label}</span><span style={{fontSize: 52, fontWeight: 700, color: C.text}}>{value}</span>
  </div>
);
export const Scene2 = () => {
  const t = useT();
  const words = interpolate(t, [21.6, 22.4], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.page, fontFamily: FONT}}>
      <style>{fontFace}</style>
      <AbsoluteFill style={{opacity: interpolate(t, [0.3, 1.0, 3.0, 3.8], [0, 1, 1, 0], clamp), alignItems: "center", justifyContent: "center"}}>
        <div style={{fontSize: 96, fontWeight: 700, color: C.text, letterSpacing: -2}}>So what do we want?</div>
      </AbsoluteFill>
      <AbsoluteFill style={{padding: "200px 0 0 300px", opacity: words}}>
        <Word text="Find the cause" at={3.7} t={t} /><Word text="Understand the financial impact" at={9.0} t={t} /><Word text="Fix it" at={13.9} t={t} /><Word text="Prove it" at={18.2} t={t} />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: interpolate(t, [22.6, 23.4, 27.4, 28.2], [0, 1, 1, 0], clamp), alignItems: "center", justifyContent: "center"}}>
        <div style={{display: "flex", alignItems: "center", gap: 28}}>
          <svg width={96} height={96} viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#161a21" /><path d="M9 16a7 7 0 0112.2-4.7M23 16a7 7 0 01-12.2 4.7" fill="none" stroke="#fff" strokeWidth="2.75" strokeLinecap="round" /><path d="M21.5 7.5v5h-5M10.5 24.5v-5h5" fill="none" stroke={C.accent2} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div style={{fontSize: 96, fontWeight: 600, letterSpacing: -2, color: C.text}}>RCA Pilot</div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: interpolate(t, [28.3, 29.0], [0, 1], clamp), padding: "180px 0 0 510px"}}>
        <div style={{fontSize: 40, fontWeight: 600, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 30}}>Illustrative figures</div>
        <Fact label="Events a year" value="6" at={34.0} t={t} />
        <Fact label="Downtime per event" value="8 hours" at={36.2} t={t} />
        <Fact label="Line rate" value="3,000 packs an hour" at={40.6} t={t} />
        <Fact label="Margin" value="$0.45 a pack" at={44.2} t={t} />
        <Fact label="Cash cost per event, on average" value="$33,100" at={50.0} t={t} />
        <div style={{fontSize: 30, color: C.muted, marginTop: 40}}>Made up to show the method</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
