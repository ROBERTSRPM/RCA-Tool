import {AbsoluteFill, Img, staticFile} from "remotion";
import {C, FONT, fontFace, LogoMark} from "./tokens";

const Brand = ({dark = false, size = 48}: {dark?: boolean; size?: number}) => (
  <div style={{display: "flex", alignItems: "center", gap: 14, ...(dark ? {background: "#fff", padding: "10px 22px 10px 12px", borderRadius: 12} : {})}}>
    <LogoMark size={size} />
    <div style={{fontSize: size * 0.8, fontWeight: 600, color: C.text, letterSpacing: -0.5}}>RCA Pilot</div>
  </div>
);
const Base = ({children, bg}: {children: React.ReactNode; bg: string}) => (
  <AbsoluteFill style={{background: bg, fontFamily: FONT}}><style>{fontFace}</style>{children}</AbsoluteFill>
);

// A: the GM's question, dark with a HOLD tag
export const ThumbA = () => (
  <Base bg={C.night}>
    <div style={{position: "absolute", left: 64, top: 56}}><Brand dark /></div>
    <div style={{position: "absolute", left: 64, top: 170, width: 780, fontSize: 104, fontWeight: 800, lineHeight: 1.0, letterSpacing: -3, color: "#fff"}}>Why does this keep happening?</div>
    <div style={{position: "absolute", left: 64, bottom: 60, fontSize: 40, color: "#cbd0d8", fontWeight: 500}}>Root cause analysis, start to finish</div>
    <div style={{position: "absolute", right: 64, top: 110, transform: "rotate(7deg)", background: C.red, color: "#fff", fontSize: 96, fontWeight: 800, padding: "18px 44px", borderRadius: 14, letterSpacing: 2}}>HOLD</div>
    <div style={{position: "absolute", right: 64, top: 330, fontSize: 120, fontWeight: 800, color: "#fff", letterSpacing: -3}}>6,000</div>
    <div style={{position: "absolute", right: 64, top: 462, fontSize: 40, color: "#cbd0d8"}}>packs on hold</div>
  </Base>
);
// B: the money
export const ThumbB = () => (
  <Base bg={C.page}>
    <div style={{position: "absolute", left: 64, top: 56}}><Brand /></div>
    <div style={{position: "absolute", left: 64, top: 150, fontSize: 200, fontWeight: 800, letterSpacing: -7, color: C.accent, lineHeight: 1}}>$263,400</div>
    <div style={{position: "absolute", left: 70, top: 370, fontSize: 84, fontWeight: 700, letterSpacing: -2, color: C.text, lineHeight: 1.05, width: 1100}}>a year from one tray sealer</div>
    <div style={{position: "absolute", left: 70, bottom: 56, display: "flex", gap: 26, alignItems: "center"}}>
      <div style={{width: 8, height: 64, background: C.accent, borderRadius: 4}} />
      <div style={{fontSize: 42, color: C.muted, fontWeight: 500}}>Find the cause. Prove the fix. (illustrative)</div>
    </div>
  </Base>
);
// C: the product, from rough notes to a verified fix
export const ThumbC = () => (
  <Base bg="#fff">
    <Img src={staticFile("thumb-c-bg.jpg")} style={{position: "absolute", right: -60, top: 0, width: 900, height: 720, objectFit: "cover", opacity: 0.95, borderLeft: `3px solid ${C.strong}`}} />
    <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 640, background: "rgba(255,255,255,0.97)"}} />
    <div style={{position: "absolute", left: 56, top: 52}}><Brand /></div>
    <div style={{position: "absolute", left: 56, top: 150, width: 560, fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5, color: C.text}}>From "seals bad" to a verified fix</div>
    <div style={{position: "absolute", left: 56, bottom: 56, fontSize: 38, color: C.muted, fontWeight: 500, width: 540}}>Full walkthrough, step by step</div>
  </Base>
);
export const EndCardW = () => (
  <AbsoluteFill style={{background: C.page, alignItems: "center", justifyContent: "center", fontFamily: FONT}}>
    <style>{fontFace}</style>
    <div style={{textAlign: "center"}}>
      <div style={{display: "inline-flex", alignItems: "center", gap: 22}}>
        <LogoMark size={88} />
        <div style={{fontSize: 84, fontWeight: 600, letterSpacing: -1.5, color: C.text}}>RCA Pilot <span style={{fontSize: 34, fontWeight: 400, color: C.muted, letterSpacing: 0}}>by Intelbeyond</span></div>
      </div>
      <div style={{width: 120, height: 4, background: C.accent, margin: "40px auto 34px", borderRadius: 2}} />
      <div style={{fontSize: 40, color: C.muted}}>The AI suggests. Your people decide.</div>
      <div style={{fontSize: 56, fontWeight: 600, color: C.text, marginTop: 36}}>www.<span style={{color: C.accent}}>rcapilot</span>.com</div>
    </div>
  </AbsoluteFill>
);
