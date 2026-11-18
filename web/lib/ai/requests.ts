/** Validation of the request bodies the four /api/ai routes accept. */
import { parseAiContext, parseNotes, type AiContext, type ParseResult } from "./context";

export type AiFeature = "coach" | "challenge" | "capa" | "draft";
export const AI_FEATURES: AiFeature[] = ["coach", "challenge", "capa", "draft"];

export type DraftKind = "problem" | "report" | "summary";

export type AiRequest =
  | { feature: "coach"; context: AiContext; scope: "node" | "tree"; nodeId: string }
  | { feature: "challenge"; context: AiContext; focus: "cause" | "actions" | "all" }
  | { feature: "capa"; context: AiContext; rootCauseId: string }
  | { feature: "draft"; context: AiContext; kind: DraftKind; notes: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function parseRequest(feature: AiFeature, raw: unknown): ParseResult<AiRequest> {
  if (!isObj(raw)) return { ok: false, message: "The request was not valid." };
  const ctx = parseAiContext(raw.context);
  if (!ctx.ok) return ctx;
  const context = ctx.value;
  const has = (id: unknown): id is string => typeof id === "string" && context.nodes.some((n) => n.id === id);

  switch (feature) {
    case "coach": {
      const scope = raw.scope === "tree" ? "tree" : raw.scope === "node" ? "node" : null;
      if (!scope) return { ok: false, message: "Choose whether to suggest for one cause or the whole tree." };
      let nodeId = context.nodes[0].id; // the top node comes first
      if (scope === "node") {
        if (!has(raw.nodeId)) return { ok: false, message: "Select a cause first." };
        nodeId = raw.nodeId;
      }
      return { ok: true, value: { feature, context, scope, nodeId } };
    }
    case "challenge": {
      const focus = raw.focus === "cause" || raw.focus === "actions" ? raw.focus : "all";
      const hasTree = context.nodes.some((n) => n.text.trim());
      if (!hasTree && context.actions.length === 0) {
        return { ok: false, message: "Add some causes or actions first, then challenge them." };
      }
      return { ok: true, value: { feature, context, focus } };
    }
    case "capa": {
      if (!has(raw.rootCauseId)) return { ok: false, message: "Choose a root cause first." };
      const node = context.nodes.find((n) => n.id === raw.rootCauseId)!;
      if (!node.text.trim()) return { ok: false, message: "Write the root cause in words first." };
      return { ok: true, value: { feature, context, rootCauseId: node.id } };
    }
    case "draft": {
      const kind = raw.kind === "problem" || raw.kind === "report" || raw.kind === "summary" ? raw.kind : null;
      if (!kind) return { ok: false, message: "Choose what to draft." };
      const notes = parseNotes(raw.notes, kind === "problem");
      if (!notes.ok) return notes;
      if (kind !== "problem" && !context.nodes.some((n) => n.text.trim())) {
        return { ok: false, message: "Build the cause tree first, so there is something to write up." };
      }
      return { ok: true, value: { feature, context, kind, notes: notes.value } };
    }
  }
}
