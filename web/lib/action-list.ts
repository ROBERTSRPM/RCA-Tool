/**
 * The Actions tracker: every action from every investigation in one list.
 * Pure helpers for rows, filters, sorting, overdue logic and CSV export, plus
 * the one write (tick done) which goes through the same store the investigation uses.
 */
import { formatDate, todayISO } from "./dates";
import { ACTION_KINDS, kindLabel } from "./options";
import { isOpenAction, isOverdue } from "./status";
import type { InvestigationStore } from "./store/types";
import { StoreError } from "./store/types";
import type { ActionItem, ActionKind, ActionStatus, Investigation } from "./types";

export interface ActionRow {
  /** Unique across investigations. */
  key: string;
  invId: string;
  invTitle: string;
  /** Asset tag and name as typed on the investigation, e.g. "P-101 Tailings pump". */
  asset: string;
  action: ActionItem;
}

export type StatusFilter = "open" | "done" | "all";
export type DueFilter = "any" | "overdue" | "week";
/** "" is all types. "unset" is actions with no type chosen yet. */
export type TypeFilter = "" | "corrective" | "preventive" | "unset";

export interface ActionFilters {
  status: StatusFilter;
  due: DueFilter;
  /** "" is everyone. NO_OWNER matches actions with no owner. */
  owner: string;
  /** "" is every asset. NO_ASSET matches investigations with no asset. */
  asset: string;
  type: TypeFilter;
}

export const NO_OWNER = "__none__";
export const NO_ASSET = "__none__";

export const DEFAULT_FILTERS: ActionFilters = { status: "open", due: "any", owner: "", asset: "", type: "" };

export const STATUS_WORD: Record<ActionStatus, string> = { open: "Open", in_progress: "In progress", done: "Done" };

export function assetLabel(inv: Pick<Investigation, "problem">): string {
  const p = inv.problem;
  const tag = (p.assetTag ?? "").trim();
  const name = (p.asset ?? "").trim();
  if (tag && name && name.toLowerCase().startsWith(tag.toLowerCase())) return name;
  return [tag, name].filter(Boolean).join(" ");
}

export function buildRows(invs: Investigation[]): ActionRow[] {
  const rows: ActionRow[] = [];
  for (const inv of invs) {
    const asset = assetLabel(inv);
    for (const action of inv.actions) {
      rows.push({
        key: `${inv.id}:${action.id}`,
        invId: inv.id,
        invTitle: inv.problem.title.trim() || "Untitled investigation",
        asset,
        action,
      });
    }
  }
  return rows;
}

/** YYYY-MM-DD plus a number of days, in calendar terms (no time zone drift). */
export function addDaysISO(iso: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

/** Due from today up to and including the 6th day after (7 days in all). Overdue is not "this week". */
export function isDueThisWeek(a: ActionItem, today: string = todayISO()): boolean {
  return a.dueDate !== "" && a.dueDate >= today && a.dueDate <= addDaysISO(today, 6);
}

export function matchesFilters(row: ActionRow, f: ActionFilters, today: string = todayISO()): boolean {
  const a = row.action;
  if (f.status === "open" && !isOpenAction(a)) return false;
  if (f.status === "done" && a.status !== "done") return false;
  if (f.due === "overdue" && !isOverdue(a, today)) return false;
  if (f.due === "week" && !isDueThisWeek(a, today)) return false;
  if (f.owner) {
    const owner = a.owner.trim();
    if (f.owner === NO_OWNER ? owner !== "" : owner !== f.owner) return false;
  }
  if (f.asset) {
    if (f.asset === NO_ASSET ? row.asset !== "" : row.asset !== f.asset) return false;
  }
  if (f.type === "unset") {
    if (a.kind === "corrective" || a.kind === "preventive") return false;
  } else if (f.type && a.kind !== f.type) return false;
  return true;
}

/** Overdue first, then by due date (no date last), then by investigation title. */
export function sortRows(rows: ActionRow[], today: string = todayISO()): ActionRow[] {
  return [...rows].sort((x, y) => {
    const ox = isOverdue(x.action, today) ? 0 : 1;
    const oy = isOverdue(y.action, today) ? 0 : 1;
    if (ox !== oy) return ox - oy;
    const dx = x.action.dueDate || "9999-99-99";
    const dy = y.action.dueDate || "9999-99-99";
    if (dx !== dy) return dx < dy ? -1 : 1;
    return x.invTitle.localeCompare(y.invTitle) || x.action.description.localeCompare(y.action.description);
  });
}

export function filterRows(rows: ActionRow[], f: ActionFilters, today: string = todayISO()): ActionRow[] {
  return sortRows(rows.filter((r) => matchesFilters(r, f, today)), today);
}

/** Distinct, trimmed, sorted values for the owner and asset pickers, plus whether any are blank. */
export function filterChoices(rows: ActionRow[]): { owners: string[]; assets: string[]; blankOwner: boolean; blankAsset: boolean } {
  const owners = new Set<string>();
  const assets = new Set<string>();
  let blankOwner = false;
  let blankAsset = false;
  for (const r of rows) {
    const o = r.action.owner.trim();
    if (o) owners.add(o);
    else blankOwner = true;
    if (r.asset) assets.add(r.asset);
    else blankAsset = true;
  }
  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return { owners: sort(owners), assets: sort(assets), blankOwner, blankAsset };
}

/** Reads filters from URL search params; anything unknown falls back to the default. */
export function filtersFromParams(get: (k: string) => string | null): ActionFilters {
  const pick = <T extends string>(v: string | null, allowed: readonly T[], d: T): T =>
    v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : d;
  return {
    status: pick(get("status"), ["open", "done", "all"], DEFAULT_FILTERS.status),
    due: pick(get("due"), ["any", "overdue", "week"], DEFAULT_FILTERS.due),
    owner: get("owner") ?? "",
    asset: get("asset") ?? "",
    type: pick(get("type"), ["", "corrective", "preventive", "unset"], DEFAULT_FILTERS.type),
  };
}

export const OPEN_ACTIONS_HREF = "/app/actions?status=open";
export const OVERDUE_ACTIONS_HREF = "/app/actions?status=open&due=overdue";

export function typeLabel(k: ActionKind | undefined): string {
  return kindLabel(k) || "Not set";
}

export const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "", label: "All types" },
  ...ACTION_KINDS.map((k) => ({ value: k.value as TypeFilter, label: k.label })),
  { value: "unset", label: "Not set" },
];

/* ---------- CSV export ---------- */

export const CSV_COLUMNS = ["Action", "Type", "Owner", "Due date", "Status", "Asset", "Investigation"] as const;

/** Quotes a cell, and defuses spreadsheet formulas (a leading = + - @ would be run by Excel). */
export function csvCell(value: string): string {
  let v = value.replace(/\r\n|\r/g, "\n");
  if (/^[=+\-@\t]/.test(v)) v = `'${v}`;
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** The visible rows as CSV text: a UTF-8 BOM so Excel reads accents right, and CRLF line ends. */
export function actionsToCsv(rows: ActionRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) {
    const a = r.action;
    lines.push(
      [
        a.description.trim(),
        typeLabel(a.kind),
        a.owner.trim(),
        a.dueDate,
        STATUS_WORD[a.status] ?? "Open",
        r.asset,
        r.invTitle,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function csvFileName(today: string = todayISO()): string {
  return `rca-pilot-actions-${today}.csv`;
}

/* ---------- Tick done ---------- */

/**
 * Done, or back to Open. (An action that was In progress goes back to Open;
 * the investigation's own status field is the same field, so both agree.)
 */
export function withActionDone(actions: ActionItem[], actionId: string, done: boolean): ActionItem[] {
  return actions.map((a) => (a.id === actionId ? { ...a, status: done ? "done" : "open" } : a));
}

/**
 * Saves the new status into the investigation itself, the only copy of the
 * action. The investigation page, the dashboard counts, the investigation
 * status and the Verify step all read it from there. Reads the latest saved
 * version first and writes against its updatedAt, so a change made elsewhere
 * is never overwritten (a conflict is thrown instead). Returns the saved investigation.
 */
export async function setActionDone(
  store: Pick<InvestigationStore, "get" | "update">,
  invId: string,
  actionId: string,
  done: boolean,
): Promise<Investigation> {
  const fresh = await store.get(invId);
  if (!fresh) throw new StoreError("This investigation no longer exists.", "not_found");
  if (!fresh.actions.some((a) => a.id === actionId)) {
    throw new StoreError("This action no longer exists.", "not_found");
  }
  return store.update(invId, { actions: withActionDone(fresh.actions, actionId, done) }, fresh.updatedAt);
}

export function dueText(a: ActionItem): string {
  return a.dueDate ? formatDate(a.dueDate) : "No date";
}
