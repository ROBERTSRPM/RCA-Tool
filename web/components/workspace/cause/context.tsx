"use client";

import { createContext, useContext } from "react";
import type { CauseNode, Investigation } from "@/lib/types";

export interface CauseCtx {
  inv: Investigation;
  selectedId: string;
  select: (id: string) => void;
  /** node whose text field should grab focus (just created) */
  focusId: string | null;
  clearFocus: () => void;
  addChild: (id: string) => void;
  addSibling: (id: string) => void;
  remove: (node: CauseNode) => void;
  move: (id: string, dir: "up" | "down") => void;
  toggle: (id: string) => void;
  setText: (id: string, text: string) => void;
  scrollToDetails: () => void;
}

export const CauseContext = createContext<CauseCtx | null>(null);

export function useCause(): CauseCtx {
  const c = useContext(CauseContext);
  if (!c) throw new Error("useCause outside provider");
  return c;
}
