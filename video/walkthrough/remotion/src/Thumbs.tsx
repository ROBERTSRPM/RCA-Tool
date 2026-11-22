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

// thumb 1: the story moment (both phones ringing at night) with the general manager's question
export const ThumbA = () => (
  <Base bg={C.night}>
    <Img src={staticFile("thumb1-bg.jpg")} style={{position: "absolute", left: -140, top: -130, width: 1560, height: 877, objectFit: "cover"}} />
    <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 330, background: "linear-gradient(to top, rgba(14,18,24,0.97) 55%, rgba(14,18,24,0))"}} />
    <div style={{position: "absolute", left: 56, bottom: 44, width: 1170, fontSize: 118, fontWeight: 800, lineHeight: 1.0, letterSpacing: -3, color: "#fff"}}>Why does this <span style={{color: "#fb923c"}}>keep happening?</span></div>
    <div style={{position: "absolute", left: 40, top: 36}}><LogoMark size={76} /></div>
  </Base>
);
// thumb 2: the real app, the verified saving
export const ThumbB = () => (
  <Base bg={C.page}>
    <div style={{position: "absolute", left: 40, top: 36}}><LogoMark size={76} /></div>
    <div style={{position: "absolute", left: 56, top: 112, width: 1170, fontSize: 132, fontWeight: 800, letterSpacing: -4, color: C.text, lineHeight: 1}}><span style={{color: C.accent}}>$219,500</span> saved</div>
    <div style={{position: "absolute", left: 60, top: 252, fontSize: 84, fontWeight: 800, letterSpacing: -2, color: C.text}}>and proven</div>
    <Img src={staticFile("thumb2-crop.jpg")} style={{position: "absolute", left: 56, bottom: 40, width: 1000, borderRadius: 18, border: `5px solid ${C.accent}`, boxShadow: "0 14px 40px rgba(0,0,0,0.25)"}} />
  </Base>
);
// thumb 3: the real app, the cause tree
export const ThumbC = () => (
  <Base bg={C.night}>
    <div style={{position: "absolute", left: 40, top: 36}}><LogoMark size={76} /></div>
    <div style={{position: "absolute", left: 56, top: 122, width: 1190, fontSize: 112, fontWeight: 800, letterSpacing: -4, color: "#fff", lineHeight: 1.02}}>Find the <span style={{color: "#fb923c"}}>real cause</span></div>
    <Img src={staticFile("thumb3-crop.jpg")} style={{position: "absolute", left: 56, bottom: 40, width: 1010, borderRadius: 18, border: `5px solid #fb923c`, boxShadow: "0 14px 40px rgba(0,0,0,0.5)"}} />
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
