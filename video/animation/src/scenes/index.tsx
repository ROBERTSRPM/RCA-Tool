import React from "react";
import {S01, S02, S03, S04, S07} from "./a";
const Missing: React.FC = () => <div style={{background: "#000", color: "#fff", fontSize: 80}}>missing</div>;
export const SCENES: Record<string, React.FC> = {
  s01: S01, s02: S02, s03: S03, s04: S04, s07: S07,
};
for (let i = 1; i <= 17; i++) { const k = "s" + String(i).padStart(2, "0"); if (!SCENES[k]) SCENES[k] = Missing; }
