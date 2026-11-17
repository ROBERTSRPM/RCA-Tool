/**
 * Pure asset-register logic: matching on tag, building an asset from an
 * investigation, parsing a pasted list, and per-asset statistics.
 */
import { uid } from "./id";
import { calcLoss } from "./finance";
import { isVerifiedClosed, verifiedSaving } from "./finance";
import { norm } from "./text";
import type { Asset, Criticality, Investigation, Problem } from "./types";
import { ASSET_TYPES } from "./options";

/** Tag matching key: case-insensitive, trimmed, inner spaces collapsed. "" means no tag. */
export function tagKey(tag: unknown): string {
  return norm(tag);
}

export function findAssetByTag(assets: Asset[], tag: unknown): Asset | undefined {
  const key = tagKey(tag);
  if (!key) return undefined;
  return assets.find((a) => tagKey(a.tag) === key);
}

/** The canonical list label for a typed type ("slurry pump" -> "Slurry pump"), else the trimmed text. */
export function canonicalType(text: unknown): string {
  const t = typeof text === "string" ? text.trim() : "";
  const hit = ASSET_TYPES.find((x) => norm(x) === norm(t));
  return hit ?? t;
}

const CRITICALITIES: Criticality[] = ["A", "B", "C"];
export function parseCriticality(v: unknown): Criticality {
  const t = typeof v === "string" ? v.trim().toUpperCase() : "";
  return (CRITICALITIES as string[]).includes(t) ? (t as Criticality) : "";
}

/** Reads the asset details out of a problem, treating missing fields as empty. */
export function problemAssetInfo(p: Partial<Problem>) {
  return {
    tag: (p.assetTag ?? "").trim(),
    type: canonicalType(p.assetType ?? ""),
    makeModel: (p.makeModel ?? "").trim(),
    duty: (p.duty ?? "").trim(),
    criticality: parseCriticality(p.criticality),
    site: (p.site ?? "").trim(),
    failureMode: (p.failureMode ?? "").trim(),
  };
}

export function blankAsset(seed: Partial<Asset> = {}): Asset {
  const now = new Date().toISOString();
  return {
    id: uid(),
    tag: "",
    type: "",
    makeModel: "",
    duty: "",
    criticality: "",
    site: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...seed,
  };
}

/** A new register entry from an investigation's asset details; null when it has no tag. */
export function assetFromProblem(p: Partial<Problem>): Asset | null {
  const i = problemAssetInfo(p);
  if (!i.tag) return null;
  return blankAsset({
    tag: i.tag,
    type: i.type,
    makeModel: i.makeModel,
    duty: i.duty,
    criticality: i.criticality,
    site: i.site,
  });
}

/**
 * Fills the blanks of an existing asset from an investigation's details.
 * Never overwrites something already in the register. Returns the same object
 * when nothing changed, so callers can skip a write.
 */
export function fillAssetFromProblem(asset: Asset, p: Partial<Problem>): Asset {
  const i = problemAssetInfo(p);
  const next: Asset = { ...asset };
  if (!next.type && i.type) next.type = i.type;
  if (!next.makeModel && i.makeModel) next.makeModel = i.makeModel;
  if (!next.duty && i.duty) next.duty = i.duty;
  if (!next.criticality && i.criticality) next.criticality = i.criticality;
  if (!next.site && i.site) next.site = i.site;
  const changed =
    next.type !== asset.type ||
    next.makeModel !== asset.makeModel ||
    next.duty !== asset.duty ||
    next.criticality !== asset.criticality ||
    next.site !== asset.site;
  return changed ? next : asset;
}

export type EnsureAssetPlan =
  | { action: "none" }
  | { action: "create"; asset: Asset }
  | { action: "update"; asset: Asset };

/** What to do so that an investigation's tag exists in the register. */
export function planEnsureAsset(assets: Asset[], p: Partial<Problem>): EnsureAssetPlan {
  const hit = findAssetByTag(assets, p.assetTag);
  if (hit) {
    const filled = fillAssetFromProblem(hit, p);
    return filled === hit ? { action: "none" } : { action: "update", asset: filled };
  }
  const created = assetFromProblem(p);
  return created ? { action: "create", asset: created } : { action: "none" };
}

/* ---------- Pasted lists ---------- */

export interface ParsedAssetLine {
  tag: string;
  type: string;
  duty: string;
}

export interface ParsedAssetList {
  assets: ParsedAssetLine[];
  /** Tags already in the register or repeated in the paste (skipped). */
  duplicates: string[];
  /** 1-based line numbers that had no tag. */
  blankLines: number;
}

/** Splits on tab, comma, semicolon or pipe. Line = tag, type, duty (duty may contain more commas). */
export function parseAssetList(text: string, existing: Asset[] = []): ParsedAssetList {
  const seen = new Set(existing.map((a) => tagKey(a.tag)));
  const assets: ParsedAssetLine[] = [];
  const duplicates: string[] = [];
  let blankLines = 0;
  const lines = text.split(/\r?\n/);
  lines.forEach((raw) => {
    if (!raw.trim()) return;
    const parts = raw.split(/\t|;|\||,/).map((s) => s.trim());
    const tag = parts[0] ?? "";
    if (!tag) {
      blankLines += 1;
      return;
    }
    const key = tagKey(tag);
    if (seen.has(key)) {
      duplicates.push(tag);
      return;
    }
    seen.add(key);
    assets.push({
      tag,
      type: canonicalType(parts[1] ?? ""),
      duty: parts.slice(2).filter(Boolean).join(", "),
    });
  });
  return { assets, duplicates, blankLines };
}

/* ---------- Statistics ---------- */

export interface AssetStats {
  investigations: Investigation[];
  /** Sum of "events per year" across its investigations. */
  failuresPerYear: number;
  /** Sum of annual loss across its investigations, in `currency`. */
  annualLoss: number;
  currency: string;
  /** True when investigations use more than one currency (only `currency` is summed). */
  mixedCurrency: boolean;
  verifiedSaving: number;
  closedCount: number;
}

/** Investigations whose asset tag matches this asset's tag. */
export function investigationsForAsset(asset: Asset, invs: Investigation[]): Investigation[] {
  const key = tagKey(asset.tag);
  if (!key) return [];
  return invs.filter((i) => tagKey(i.problem.assetTag) === key);
}

export function assetStats(asset: Asset, invs: Investigation[]): AssetStats {
  const list = investigationsForAsset(asset, invs);
  const counts = new Map<string, number>();
  list.forEach((i) => {
    const c = i.loss.currency || "$";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  });
  let currency = "$";
  let best = 0;
  counts.forEach((n, c) => {
    if (n > best) {
      best = n;
      currency = c;
    }
  });
  const same = list.filter((i) => (i.loss.currency || "$") === currency);
  return {
    investigations: list,
    failuresPerYear: same.reduce((s, i) => s + (i.loss.eventsPerYear ?? 0), 0),
    annualLoss: same.reduce((s, i) => s + calcLoss(i.loss).annualLoss, 0),
    currency,
    mixedCurrency: counts.size > 1,
    verifiedSaving: same.reduce((s, i) => s + verifiedSaving(i), 0),
    closedCount: list.filter((i) => isVerifiedClosed(i)).length,
  };
}

export function sortAssets(assets: Asset[]): Asset[] {
  return [...assets].sort((a, b) =>
    a.tag.localeCompare(b.tag, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/** Register search: tag, type, make/model, duty, site. */
export function filterAssets(assets: Asset[], query: string): Asset[] {
  const q = norm(query);
  if (!q) return assets;
  return assets.filter((a) =>
    norm([a.tag, a.type, a.makeModel, a.duty, a.site].join(" ")).includes(q),
  );
}
