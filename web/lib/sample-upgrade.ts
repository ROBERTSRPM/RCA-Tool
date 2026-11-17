/**
 * Keeps the illustrative sample current. A stored sample that is still exactly
 * one of the sample versions we shipped earlier (nobody edited it) is replaced
 * by the current sample. Any edit, however small, makes it the user's own work
 * and it is left alone. "Edited" is judged on content, not on updatedAt,
 * because a reset or a new account stamps a fresh updatedAt on a pristine sample.
 */
import { normaliseInvestigation } from "./normalize";
import { buildSample } from "./sample";
import type { CauseNode, Investigation } from "./types";

/** Fingerprints of earlier shipped samples. Add the old fingerprint here whenever the sample changes. */
export const OLD_SAMPLE_FINGERPRINTS: ReadonlySet<string> = new Set([
  // v1: the first shipped sample (no asset, CAPA, spares or rollout fields; action 1 cost $28,000).
  "a4fec205-8977",
]);

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function nodeProjection(n: CauseNode): unknown {
  return [n.id, n.text, n.category, n.status, n.evidenceIds, n.isRootCause, n.deterioration ?? "", n.children.map(nodeProjection)];
}

/** Hash of everything a user can change in a sample (not UI state such as collapsed nodes, nor timestamps). */
export function sampleFingerprint(raw: unknown): string | null {
  const inv = normaliseInvestigation(raw);
  if (!inv) return null;
  const p = inv.problem;
  const body = stable({
    p: [p.title, p.asset, p.site, p.eventDate, p.whatHappened, p.where, p.when, p.impact, p.assetTag ?? "", p.assetType ?? "", p.makeModel ?? "", p.duty ?? "", p.criticality ?? "", p.failureMode ?? ""],
    loss: inv.loss,
    evidence: inv.evidence.map((e) => [e.id, e.type, e.title, e.note, e.date, e.image]),
    tree: nodeProjection(inv.tree),
    actions: inv.actions.map((a) => [a.id, a.causeId, a.description, a.owner, a.dueDate, a.status, a.cost, a.kind ?? "", a.category ?? "", a.task ?? null]),
    verification: inv.verification,
    spares: inv.spares ?? null,
    rollouts: inv.rollouts ?? [],
  });
  // FNV-1a, 32 bit, plus the length: plenty to tell versions apart.
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16)}-${body.length}`;
}

/**
 * The current sample (same id) if `stored` is an unedited older sample, else null.
 * `stored` may be anything read from storage.
 */
export function upgradeSampleIfOld(stored: Investigation, now = new Date().toISOString()): Investigation | null {
  if (!stored.isSample) return null;
  const fp = sampleFingerprint(stored);
  if (!fp || !OLD_SAMPLE_FINGERPRINTS.has(fp)) return null;
  const current = buildSample();
  if (fp === sampleFingerprint(current)) return null;
  const prev = Date.parse(stored.updatedAt);
  const stamp = Number.isFinite(prev) && prev >= Date.parse(now) ? new Date(prev + 1).toISOString() : now;
  return { ...current, id: stored.id, updatedAt: stamp };
}
