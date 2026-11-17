"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { assetStats, blankAsset, filterAssets, findAssetByTag, parseAssetList } from "@/lib/assets";
import { notifyAssetsChanged } from "@/lib/assets-events";
import { formatDate } from "@/lib/dates";
import { formatMoney, formatNumber } from "@/lib/finance";
import { ASSET_TYPES, CRITICALITY_OPTIONS, criticalityLabel } from "@/lib/options";
import { getAssetStore, getStore, StoreError } from "@/lib/store";
import { useAssets } from "@/lib/use-assets";
import type { Asset, Criticality, Investigation } from "@/lib/types";
import { Icon } from "../icons";
import { ChoiceGroup, ComboField, EmptyState, TextAreaField, TextField, useConfirm } from "../ui";

const MAX_PASTE_LINES = 500;

function message(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function AssetsPage() {
  const confirm = useConfirm();
  const { state } = useAssets();
  const [invs, setInvs] = useState<Investigation[]>([]);
  // The list shows as soon as the assets arrive; the figures from investigations fill in when they do.
  const [invsLoaded, setInvsLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"none" | "add" | "paste">("none");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getStore()
      .list()
      .then((l) => {
        if (!live) return;
        setInvs(l);
        setInvsLoaded(true);
      })
      .catch(() => live && setInvsLoaded(true));
    return () => {
      live = false;
    };
  }, []);

  const assets = useMemo(() => (state.status === "ready" ? state.assets : []), [state]);
  const shown = useMemo(() => filterAssets(assets, query), [assets, query]);
  const usable = state.status === "ready";

  async function remove(a: Asset) {
    const used = assetStats(a, invs).investigations.length;
    const ok = await confirm({
      title: "Delete this asset?",
      message:
        `${a.tag} will be removed from the register.` +
        (used > 0
          ? ` ${used} ${used === 1 ? "investigation uses" : "investigations use"} this tag; they keep it and are not deleted.`
          : ""),
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      setError(null);
      await getAssetStore().delete(a.id);
      notifyAssetsChanged();
    } catch (e) {
      setError(message(e, "Could not delete the asset."));
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">Assets</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Your equipment register. See which assets fail most, what they cost, and which are
            similar enough to share a fix.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!usable}
            onClick={() => setMode(mode === "paste" ? "none" : "paste")}
          >
            <Icon name="list" /> Paste a list
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!usable}
            onClick={() => setMode(mode === "add" ? "none" : "add")}
          >
            <Icon name="plus" /> Add asset
          </button>
        </div>
      </div>

      {state.status === "unavailable" && (
        <p role="note" data-testid="register-unavailable" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>The asset register is not set up on this server yet.</strong> Assets cannot be
          saved or listed until the site owner applies the database update. Investigations, actions
          and reports all work as before.
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {usable && mode === "add" && (
        <div className="mt-5">
          <AssetForm
            title="Add an asset"
            initial={blankAsset()}
            assets={assets}
            submitLabel="Add asset"
            onCancel={() => setMode("none")}
            onSave={async (a) => {
              await getAssetStore().create(a);
              notifyAssetsChanged();
              setMode("none");
            }}
          />
        </div>
      )}
      {usable && mode === "paste" && (
        <div className="mt-5">
          <PasteList assets={assets} onClose={() => setMode("none")} />
        </div>
      )}

      {usable && assets.length > 0 && (
        <div className="mt-6 max-w-md">
          <label className="label" htmlFor="asset-search">
            Search assets
          </label>
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="asset-search"
              type="search"
              className="input pl-9"
              placeholder="Tag, type, make, duty or area"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <section aria-label="Asset list" className="mt-6">
        {state.status === "loading" ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : usable && assets.length === 0 ? (
          <EmptyState
            title="No assets yet"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className="btn btn-primary" onClick={() => setMode("add")}>
                  <Icon name="plus" /> Add your first asset
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setMode("paste")}>
                  Paste a list
                </button>
              </div>
            }
          >
            Assets are added automatically when an investigation has an asset tag. You can also add
            them by hand or paste a list from a spreadsheet.
          </EmptyState>
        ) : usable && shown.length === 0 ? (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">No asset matches “{query}”.</p>
        ) : (
          <ul className="space-y-3">
            {shown.map((a) => (
              <li key={a.id} data-testid="asset-row" className="card p-4 sm:p-5">
                {editing === a.id ? (
                  <AssetForm
                    title={`Edit ${a.tag}`}
                    initial={a}
                    assets={assets}
                    submitLabel="Save changes"
                    onCancel={() => setEditing(null)}
                    onSave={async (next) => {
                      const { id, createdAt, updatedAt, ...patch } = next;
                      void id; void createdAt; void updatedAt;
                      await getAssetStore().update(a.id, patch);
                      notifyAssetsChanged();
                      setEditing(null);
                    }}
                  />
                ) : (
                  <AssetCard asset={a} invs={invs} loaded={invsLoaded} onEdit={() => setEditing(a.id)} onDelete={() => remove(a)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function AssetCard({
  asset: a,
  invs,
  loaded,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  invs: Investigation[];
  loaded: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const st = assetStats(a, invs);
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
            {a.tag}
            {a.type && <span className="chip bg-slate-100 text-slate-800">{a.type}</span>}
            {a.criticality && (
              <span
                className={`chip ${
                  a.criticality === "A" ? "bg-red-100 text-red-800" : a.criticality === "B" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-800"
                }`}
              >
                {criticalityLabel(a.criticality)}
              </span>
            )}
            {a.isSample && <span className="chip bg-amber-100 text-amber-900">Illustrative sample</span>}
          </h2>
          <p className="mt-0.5 text-sm text-slate-700">
            {[a.makeModel, a.duty].filter(Boolean).join(" · ") || "No make or duty recorded"}
          </p>
          {a.site && <p className="text-sm text-slate-600">{a.site}</p>}
          {a.notes && <p className="mt-1 text-sm text-slate-600">{a.notes}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" aria-label={`Edit ${a.tag}`} onClick={onEdit}>
            <Icon name="edit" size={16} /> Edit
          </button>
          <button type="button" className="btn btn-danger btn-sm" aria-label={`Delete ${a.tag}`} onClick={onDelete}>
            <Icon name="trash" size={16} /> Delete
          </button>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3 sm:gap-3">
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-slate-100 p-2.5 sm:block">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Investigations</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{loaded ? st.investigations.length : "…"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-slate-100 p-2.5 sm:block">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failures a year</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{loaded ? formatNumber(st.failuresPerYear, 1) : "…"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-slate-100 p-2.5 sm:block">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Annual loss</dt>
          <dd className="mt-0.5 break-words text-lg font-bold tabular-nums text-slate-900">
            {loaded ? formatMoney(st.annualLoss, st.currency) : "…"}
          </dd>
        </div>
      </dl>
      {st.mixedCurrency && (
        <p className="mt-1 text-xs text-slate-600">Money only includes investigations measured in {st.currency}.</p>
      )}

      {st.investigations.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label={`Investigations on ${a.tag}`}>
          {st.investigations.map((i) => (
            <li key={i.id} className="text-sm">
              <Link href={`/app/investigations/${i.id}`} className="font-semibold text-slate-900 underline decoration-slate-400 hover:text-amber-700">
                {i.problem.title || "Untitled investigation"}
              </Link>
              {i.problem.eventDate && <span className="text-slate-600"> · {formatDate(i.problem.eventDate)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssetForm({
  title,
  initial,
  assets,
  submitLabel,
  onSave,
  onCancel,
}: {
  title: string;
  initial: Asset;
  assets: Asset[];
  submitLabel: string;
  onSave: (a: Asset) => Promise<void>;
  onCancel: () => void;
}) {
  const [a, setA] = useState<Asset>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Asset>(k: K, v: Asset[K]) => setA((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const tag = a.tag.trim();
    if (!tag) {
      setError("Enter the asset tag.");
      return;
    }
    const clash = findAssetByTag(assets.filter((x) => x.id !== a.id), tag);
    if (clash) {
      setError(`There is already an asset with the tag ${clash.tag}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...a, tag, type: a.type.trim() });
    } catch (err) {
      setError(err instanceof StoreError ? err.message : message(err, "Could not save the asset."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label={title} className="card space-y-4 p-4 sm:p-5">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Asset tag" placeholder="e.g. P-101" value={a.tag} onChange={(v) => set("tag", v)} />
        <ComboField label="Asset type" options={ASSET_TYPES} value={a.type} onChange={(v) => set("type", v)} />
        <TextField label="Make and model" placeholder="e.g. Warman 8/6 AH" value={a.makeModel} onChange={(v) => set("makeModel", v)} />
        <TextField label="Duty or service" placeholder="e.g. tailings transfer" value={a.duty} onChange={(v) => set("duty", v)} />
        <TextField label="Site / area" placeholder="e.g. Concentrator plant, thickener area" value={a.site} onChange={(v) => set("site", v)} />
        <TextField label="Notes" value={a.notes} onChange={(v) => set("notes", v)} />
        <ChoiceGroup<Exclude<Criticality, "">>
          className="sm:col-span-2"
          label="Criticality"
          options={CRITICALITY_OPTIONS}
          value={a.criticality}
          onChange={(v) => set("criticality", v)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PasteList({ assets, onClose }: { assets: Asset[]; onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const parsed = useMemo(() => parseAssetList(text, assets), [text, assets]);
  const tooMany = lines > MAX_PASTE_LINES;

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const made = await getAssetStore().createMany(
        parsed.assets.map((p) => blankAsset({ tag: p.tag, type: p.type, duty: p.duty })),
      );
      notifyAssetsChanged();
      setDone(`Added ${made.length} ${made.length === 1 ? "asset" : "assets"}.`);
      setText("");
    } catch (e) {
      setError(message(e, "Could not add the assets."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Paste a list of assets" className="card space-y-3 p-4 sm:p-5">
      <h2 className="text-lg font-bold text-slate-900">Paste a list of assets</h2>
      <TextAreaField
        label="One asset per line: tag, type, duty"
        help="Separate the parts with commas or tabs, so a column copied from a spreadsheet works. Type and duty are optional."
        rows={6}
        placeholder={"P-102, Slurry pump, Tailings transfer\nP-103, Centrifugal pump, Process water supply\nC-201, Belt conveyor, Ore feed"}
        value={text}
        onChange={(v) => {
          setText(v);
          setDone(null);
        }}
      />
      {text.trim() && (
        <p className="text-sm text-slate-700" data-testid="paste-summary">
          {parsed.assets.length} new {parsed.assets.length === 1 ? "asset" : "assets"}
          {parsed.duplicates.length > 0 && `, ${parsed.duplicates.length} already in the register or repeated (skipped: ${parsed.duplicates.slice(0, 5).join(", ")}${parsed.duplicates.length > 5 ? "…" : ""})`}
          {parsed.blankLines > 0 && `, ${parsed.blankLines} ${parsed.blankLines === 1 ? "line" : "lines"} without a tag (skipped)`}.
        </p>
      )}
      {tooMany && (
        <p role="alert" className="text-sm font-medium text-red-700">
          That is {lines} lines. Paste at most {MAX_PASTE_LINES} at a time.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm font-medium text-emerald-800">
          {done}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || tooMany || parsed.assets.length === 0} onClick={add}>
          {busy ? "Adding…" : `Add ${parsed.assets.length || ""} ${parsed.assets.length === 1 ? "asset" : "assets"}`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}
