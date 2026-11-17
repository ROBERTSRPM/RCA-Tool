import React from "react";
import {Audio, getInputProps, OffthreadVideo, staticFile} from "remotion";

/** Picture-in-picture box: 440 x 248 px, 48 px from the right and bottom edges (1920x1080 frame). */
export const PIP = {w: 440, h: 248, right: 48, bottom: 48, margin: 24};
export const PIP_X = 1920 - PIP.right - PIP.w; // 1432
export const PIP_Y = 1080 - PIP.bottom - PIP.h; // 784

export type PresenterMode = "full" | "corner" | "none";
export type SceneCfg = {
  id: string; title: string; duration: number;
  presenter?: PresenterMode; presenterVideo?: string | null; audio?: string | null;
};

/** Debug flag: input prop `presenterDebug` (CLI: --props='{"presenterDebug":true}') or env REMOTION_PRESENTER_DEBUG=1. */
export const presenterDebug = (): boolean => {
  const p = getInputProps() as {presenterDebug?: boolean | string};
  if (p && (p.presenterDebug === true || p.presenterDebug === "true" || p.presenterDebug === "1")) return true;
  try {
    const e = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
    return e.REMOTION_PRESENTER_DEBUG === "1" || e.REMOTION_PRESENTER_DEBUG === "true";
  } catch {
    return false;
  }
};

/** Draws the presenter clip / placeholder and plays the scene audio. Rendered above the scene animation. */
export const PresenterLayer: React.FC<{scene: SceneCfg}> = ({scene}) => {
  const mode = scene.presenter ?? "none";
  const video = scene.presenterVideo || null;
  const audio = scene.audio || null;
  const debug = presenterDebug();
  const nodes: React.ReactNode[] = [];

  // The separate audio file wins over the clip's own audio track.
  if (audio) nodes.push(<Audio key="audio" src={staticFile(audio)} />);

  if (video) {
    if (mode === "full") {
      nodes.push(
        <div key="v" style={{position: "absolute", inset: 0, background: "#000"}}>
          <OffthreadVideo src={staticFile(video)} muted={!!audio} style={{width: "100%", height: "100%", objectFit: "cover"}} />
        </div>,
      );
    } else if (mode === "corner") {
      nodes.push(
        <div key="v" style={{position: "absolute", left: PIP_X, top: PIP_Y, width: PIP.w, height: PIP.h, borderRadius: 20, overflow: "hidden", border: "3px solid rgba(234,240,246,0.85)", boxSizing: "border-box", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", background: "#000"}}>
          <OffthreadVideo src={staticFile(video)} muted={!!audio} style={{width: "100%", height: "100%", objectFit: "cover"}} />
        </div>,
      );
    } else if (!audio) {
      nodes.push(<Audio key="a" src={staticFile(video)} />);
    }
  }

  if (debug && mode === "corner" && !video) {
    nodes.push(
      <React.Fragment key="dbg">
        <div style={{position: "absolute", left: PIP_X - PIP.margin, top: PIP_Y - PIP.margin, width: PIP.w + PIP.margin * 2 + PIP.right - PIP.margin, height: PIP.h + PIP.margin * 2 + PIP.bottom - PIP.margin, border: "2px dashed rgba(255,90,95,0.55)", boxSizing: "border-box", pointerEvents: "none"}} />
        <div style={{position: "absolute", left: PIP_X, top: PIP_Y, width: PIP.w, height: PIP.h, borderRadius: 20, border: "3px solid #2CC9D6", boxSizing: "border-box", background: "rgba(44,201,214,0.28)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif", fontSize: 44, fontWeight: 700, letterSpacing: 2}}>Presenter</div>
      </React.Fragment>,
    );
  }
  return <>{nodes}</>;
};
