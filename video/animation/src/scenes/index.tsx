import React from "react";
import {S01, S02, S03, S04} from "./a";
import {S05, S06, S08} from "./b";
import {S09, S10, S11, S12} from "./c";
import {S13, S14, S15} from "./d";
import {S16, S17} from "./e";
// Scene 7 was removed from the script; ids are kept (s01..s06, s08..s17).
export const SCENES: Record<string, React.FC> = {
  s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s08: S08, s09: S09, s10: S10, s11: S11, s12: S12, s13: S13, s14: S14, s15: S15, s16: S16, s17: S17,
};
