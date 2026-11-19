import {AbsoluteFill, Img, staticFile} from "remotion";
import {LogoMark} from "./Demo";

const C = {text: "#161a21", muted: "#586170", accent: "#c2410c", green: "#047857"};
const fontFace = `@font-face{font-family:Inter;src:url(${staticFile("fonts/inter-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900;}`;

// 1280x720 YouTube thumbnail: blurred product screen behind a headline and the sample verified saving. No faces.
export const Thumb = () => (
  <AbsoluteFill style={{background: "#f8f9fb", fontFamily: "Inter, system-ui, sans-serif"}}>
    <style>{fontFace}</style>
    <Img src={staticFile("thumb-bg.jpg")} style={{position: "absolute", inset: 0, width: 1280, height: 720, objectFit: "cover", filter: "blur(7px)", opacity: 0.55}} />
    <div style={{position: "absolute", left: 0, top: 0, bottom: 0, right: 0, background: "linear-gradient(90deg, rgba(248,249,251,0.97) 0%, rgba(248,249,251,0.93) 62%, rgba(248,249,251,0.6) 100%)"}} />
    <div style={{position: "absolute", left: 64, top: 60, display: "flex", alignItems: "center", gap: 16}}>
      <LogoMark size={56} />
      <div style={{fontSize: 40, fontWeight: 600, color: C.text}}>RCA Pilot</div>
    </div>
    <div style={{position: "absolute", left: 64, top: 160, width: 820, fontSize: 104, fontWeight: 700, lineHeight: 1.0, letterSpacing: -3, color: C.text}}>Out of firefighting mode</div>
    <div style={{position: "absolute", left: 64, bottom: 64, display: "flex", alignItems: "center", gap: 28}}>
      <div style={{width: 8, height: 92, background: C.accent, borderRadius: 4}} />
      <div>
        <div style={{fontSize: 76, fontWeight: 700, color: C.green, letterSpacing: -2, lineHeight: 1}}>$238,440</div>
        <div style={{fontSize: 30, color: C.muted, marginTop: 6}}>verified annual saving, sample investigation</div>
      </div>
    </div>
  </AbsoluteFill>
);
