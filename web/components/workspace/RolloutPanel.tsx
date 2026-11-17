"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";
import { blankAsset, findAssetByTag } from "@/lib/assets";
import { isVerifiedClosed } from "@/lib/finance";
import { criticalityLabel, ROLLOUT_STATUS, rolloutStatusLabel } from "@/lib/options";
import {
  createRolloutChecks,
  defaultRolloutCheckText,
  rankRolloutCandidates,
  rolloutProgress,
  subjectFromProblem,
} from "@/lib/rollout";
import { getAssetStore, StoreError } from "@/lib/store";
import { notifyAssetsChanged } from "@/lib/assets-events";
import { meaningful } from "@/lib/text";
import { useAssets } from "@/lib/use-assets";
import type { Investigation, RolloutCheck, RolloutStatus } from "@/lib/types";
import { Icon } from "../icons";
import { SectionCard, SelectField, TextAreaField, TextField, useConfirm } from "../ui";
import type { StepProps } from "./types";

/**
 * "Roll this fix out": other assets in the register that could fail the same
 * way, ranked; tick the ones to check and create a tracked rollout check for
 * each. Encouraged once the fix is verified, allowed earlier.
 */
export function RolloutPanel({ inv, update, go }: StepProps) {
  const confirm = useConfirm();
  const { state } = useAssets();
  const subject = subjectFromProblem(inv.problem);
  const checks = inv.rollouts ?? [];
  const progress = rolloutProgress(checks);
  const verified = isVerifiedClosed(inv);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [what, setWhat] = useState(() => defaultRolloutCheckText(inv));
  const [adding, setAdding] = useState(false);

  const candidates = useMemo(
    () => (state.status === "ready" ? rankRolloutCandidates(subject, state.assets) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, subject.tag, subject.type, subject.makeModel, subject.duty],
  );
  const haveCheck = new Set(checks.map((c) => c.assetId));
  const pickable = candidates.filter((c) => !haveCheck.has(c.asset.id));

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function create() {
    if (state.status !== "ready") return;
    const chosen = state.assets.filter((a) => picked.has(a.id));
    update((i) => ({
      ...i,
      rollouts: [...(i.rollouts ?? []), ...createRolloutChecks(chosen, what, i.rollouts ?? [])],
    }));
    setPicked(new Set());
  }

  const change = (id: string, patch: Partial<RolloutCheck>) =>
    update((i) => ({
      ...i,
      rollouts: (i.rollouts ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  async function remove(c: RolloutCheck) {
    const ok = await confirm({
      title: "Delete this rollout check?",
      message: `The check for ${c.assetTag || "this asset"} will be deleted.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) update((i) => ({ ...i, rollouts: (i.rollouts ?? []).filter((x) => x.id !== c.id) }));
  }

  return (
    <SectionCard
      title="Roll this fix out"
      help="Other assets of the same type could fail the same way. Check them now, before they do."
    >
      <div
        className={`mb-4 rounded-lg border p-3 text-sm ${
          verified ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
        data-testid="rollout-encourage"
      >
        {verified ? (
          <>
            <strong>The fix is verified.</strong> This is the moment to spread it: check the similar
            assets below so the same failure does not happen on them.
          </>
        ) : (
          <>
            Best done once the fix is verified, but you can start now: a check costs little and a
            repeat failure on a sister asset costs a lot.
          </>
        )}
      </div>

      {checks.length > 0 && (
        <div className="mb-5" data-testid="rollout-progress">
          <p className="text-sm font-semibold text-slate-900">
            Rollout progress: {progress.done} of {progress.total} checked
            {progress.sameProblem > 0 && (
              <span className="ml-2 text-red-700">
                {progress.sameProblem} {progress.sameProblem === 1 ? "has" : "have"} the same problem
              </span>
            )}
          </p>
          <div
            className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Rollout progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
          </div>
          <ul className="mt-4 space-y-4">
            {checks.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4" data-testid="rollout-check">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                    {c.assetLabel || c.assetTag || "Asset"}
                    <StatusChip status={c.status} />
                  </p>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    aria-label={`Delete rollout check for ${c.assetTag || "asset"}`}
                    onClick={() => remove(c)}
                  >
                    <Icon name="trash" size={16} /> Delete
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextAreaField
                    className="sm:col-span-3"
                    label="What to check"
                    rows={4}
                    value={c.what}
                    onChange={(v) => change(c.id, { what: v })}
                  />
                  <TextField label="Who will check it" placeholder="e.g. Sam Patel" value={c.owner} onChange={(v) => change(c.id, { owner: v })} />
                  <TextField label="Check due" type="date" value={c.dueDate} onChange={(v) => change(c.id, { dueDate: v })} />
                  <SelectField<RolloutStatus>
                    label="Result"
                    value={c.status}
                    onChange={(v) => change(c.id, { status: v })}
                    options={ROLLOUT_STATUS}
                  />
                </div>
                {c.status === "same_problem" && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-900">
                    The same problem was found. Fix it, then set the result to Fixed.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.status === "loading" && <div className="h-16 animate-pulse rounded-xl bg-slate-200" />}
      {state.status === "unavailable" && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{state.message} Rollout checks need the register.</p>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.message}</p>
      )}

      {state.status === "ready" && !meaningful(subject.type) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="rollout-needs-type">
          <p className="font-semibold">Set the asset type first.</p>
          <p className="mt-1">
            Similar assets are found by type. Choose the asset type on the Problem step and they
            will be listed here.
          </p>
          <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => go("problem")}>
            Go to Asset details
          </button>
        </div>
      )}

      {state.status === "ready" && meaningful(subject.type) && (
        <>
          {candidates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-700" data-testid="rollout-empty">
              <p className="font-semibold text-slate-900">No similar assets in your register yet</p>
              <p className="mt-1">
                Nothing else of type <strong>{subject.type}</strong> is registered. Add the sister
                assets that could fail the same way and they will appear here.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-bold text-slate-900">Assets that could fail the same way</h3>
              <p className="mb-3 text-sm text-slate-600">
                Same type ({subject.type}), best match first. Tick the ones to check.
              </p>
              <ul className="space-y-2" data-testid="rollout-candidates">
                {candidates.map(({ asset, reasons }) => {
                  const has = haveCheck.has(asset.id);
                  return (
                    <li key={asset.id}>
                      <label
                        className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50 ${
                          has ? "border-slate-200 bg-slate-50 opacity-75" : "border-slate-200 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-5 w-5 flex-none accent-slate-900"
                          checked={has || picked.has(asset.id)}
                          disabled={has}
                          onChange={() => toggle(asset.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                            {asset.tag}
                            {asset.criticality && (
                              <span className="chip bg-slate-200 text-slate-800">{criticalityLabel(asset.criticality)}</span>
                            )}
                            {has && <span className="chip bg-emerald-100 text-emerald-800">Check created</span>}
                          </span>
                          <span className="block text-sm text-slate-700">
                            {[asset.makeModel, asset.duty].filter(Boolean).join(" · ") || asset.type}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {reasons.map((r) => (
                              <span key={r} className="chip bg-white text-slate-700 ring-1 ring-inset ring-slate-300">{r}</span>
                            ))}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {pickable.length > 0 && (
                <div className="mt-4 space-y-3">
                  <TextAreaField
                    label="What to check on each asset"
                    help="Filled in from the root causes and preventive actions. Edit it, and change it later on each check."
                    rows={6}
                    value={what}
                    onChange={setWhat}
                  />
                  <button type="button" className="btn btn-primary" disabled={picked.size === 0} onClick={create}>
                    <Icon name="plus" /> Create {picked.size > 0 ? picked.size : ""} rollout {picked.size === 1 ? "check" : "checks"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            {adding || candidates.length === 0 ? (
              <AddSimilarAsset
                inv={inv}
                existingTags={state.assets.map((a) => a.tag)}
                onDone={() => setAdding(false)}
                showCancel={candidates.length > 0}
              />
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
                <Icon name="plus" size={14} /> Add a similar asset that is not listed
              </button>
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function StatusChip({ status }: { status: RolloutStatus }) {
  const style: Record<RolloutStatus, string> = {
    open: "bg-amber-100 text-amber-900",
    no_issue: "bg-emerald-100 text-emerald-800",
    same_problem: "bg-red-100 text-red-800",
    fixed: "bg-sky-100 text-sky-900",
  };
  return <span className={`chip ${style[status]}`}>{rolloutStatusLabel(status)}</span>;
}

/** Inline form: add a sister asset to the register without leaving the investigation. */
function AddSimilarAsset({
  inv,
  existingTags,
  onDone,
  showCancel,
}: {
  inv: Investigation;
  existingTags: string[];
  onDone: () => void;
  showCancel: boolean;
}) {
  const [tag, setTag] = useState("");
  const [duty, setDuty] = useState(inv.problem.duty ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const type = (inv.problem.assetType ?? "").trim();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = tag.trim();
    if (!t) {
      setError("Enter the tag of the asset.");
      return;
    }
    if (findAssetByTag(existingTags.map((x) => ({ ...blankAsset(), tag: x })), t)) {
      setError(`${t} is already in the register.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await getAssetStore().create(
        blankAsset({ tag: t, type, makeModel: inv.problem.makeModel ?? "", duty: duty.trim(), criticality: inv.problem.criticality ?? "", site: inv.problem.site }),
      );
      notifyAssetsChanged();
      setTag("");
      onDone();
    } catch (err) {
      setError(err instanceof StoreError || err instanceof Error ? err.message : "Could not add the asset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} noValidate aria-label="Add a similar asset" className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="text-base font-bold text-slate-900">Add a similar asset</h3>
      <p className="mb-3 text-sm text-slate-600">
        It is saved in your asset register as a {type || "similar asset"}
        {inv.problem.makeModel ? `, ${inv.problem.makeModel}` : ""}. Change the details later on the Assets page.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Tag of the similar asset" placeholder="e.g. P-102" value={tag} onChange={setTag} />
        <TextField label="Its duty or service" placeholder="e.g. tailings transfer" value={duty} onChange={setDuty} />
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Adding…" : "Add to the register"}
        </button>
        {showCancel && (
          <button type="button" className="btn btn-secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Report version: progress and the checks, or the candidates when none are created yet. Read only. */
export function RolloutReport({ inv }: { inv: Investigation }) {
  const { state } = useAssets();
  const checks = inv.rollouts ?? [];
  const progress = rolloutProgress(checks);
  const candidates =
    state.status === "ready" ? rankRolloutCandidates(subjectFromProblem(inv.problem), state.assets).slice(0, 6) : [];
  const have = new Set(checks.map((c) => c.assetId));
  const rest = candidates.filter((c) => !have.has(c.asset.id));

  if (checks.length === 0 && rest.length === 0) {
    return <p className="text-slate-500">No rollout checks recorded and no similar assets in the register.</p>;
  }
  return (
    <div>
      {checks.length > 0 && (
        <>
          <p>
            <strong>
              {progress.done} of {progress.total}
            </strong>{" "}
            rollout checks done: {progress.noIssue} no issue, {progress.sameProblem} same problem found,{" "}
            {progress.fixed} fixed, {progress.open} open.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-1 pr-2">Asset</th>
                  <th className="py-1 pr-2">What to check</th>
                  <th className="py-1 pr-2">Owner</th>
                  <th className="py-1 pr-2">Due</th>
                  <th className="py-1">Result</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id} className="avoid-break border-b border-slate-200 align-top">
                    <td className="py-1 pr-2 font-semibold">{c.assetLabel || c.assetTag}</td>
                    <td className="py-1 pr-2 whitespace-pre-line">{c.what}</td>
                    <td className="py-1 pr-2">{c.owner || "Unassigned"}</td>
                    <td className="py-1 pr-2 whitespace-nowrap">{c.dueDate ? formatDate(c.dueDate) : "None"}</td>
                    <td className="py-1 whitespace-nowrap">{rolloutStatusLabel(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {rest.length > 0 && (
        <div className={checks.length > 0 ? "mt-3" : ""}>
          <p className="font-semibold text-slate-700">
            {checks.length > 0 ? "Other assets that could fail the same way" : "Assets that could fail the same way (no checks created yet)"}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {rest.map(({ asset, reasons }) => (
              <li key={asset.id} className="avoid-break">
                <strong>{asset.tag}</strong> {[asset.makeModel, asset.duty].filter(Boolean).join(", ")}{" "}
                <span className="text-slate-600">({reasons.join("; ")})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
