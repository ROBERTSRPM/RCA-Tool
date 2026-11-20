import {staticFile} from "remotion";
// Design tokens from web/app/globals.css (design/design-review.md)
export const C = {page: "#f8f9fb", surface: "#ffffff", border: "#e2e5ea", strong: "#cbd0d8", text: "#161a21", muted: "#586170", accent: "#c2410c", accent2: "#ea580c", red: "#b91c1c", green: "#047857", amber: "#b45309", night: "#161a21", night2: "#232a35"};
export const FONT = "Inter, system-ui, sans-serif";
export const fontFace = `@font-face{font-family:Inter;src:url(${staticFile("fonts/inter-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900;}`;
export const LogoMark = ({size = 64}: {size?: number}) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#161a21" />
    <path d="M9 16a7 7 0 0112.2-4.7M23 16a7 7 0 01-12.2 4.7" fill="none" stroke="#fff" strokeWidth="2.75" strokeLinecap="round" />
    <path d="M21.5 7.5v5h-5M10.5 24.5v-5h5" fill="none" stroke={C.accent2} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
