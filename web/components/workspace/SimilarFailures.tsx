"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";
import { uid } from "@/lib/id";
import { copyOfCause, rankSimilar } from "@/lib/similarity";
import { getStore } from "@/lib/store";
import { addChild } from "@/lib/tree";
import type { CauseNode, Investigation } from "@/lib/types";
import { Icon } from "../icons";
import { StatusBadge } from "../StatusBadge";
import { SectionCard } from "../ui";
import type { Updater } from "./types";

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/**
 * Your other investigations that look like this one, best match first, with
 * what was found and what fixed it. A root cause can be copied into this
 * cause tree as a hypothesis (never as verified).
 */
export function SimilarFailures({
  inv,
  update,
  parentId,
  onOpenTree,
  onAdded,
}: {
  inv: Investigation;
  update: Updater;
  /** The cause a copied cause is added beneath. */
  parentId: string;
  onOpenTree?: () => void;
  onAdded?: (newId: string) => void;
}) {
  const [others, setOthers] = useState<Investigation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getStore()
      .list()
      .then((l) => live && setOthers(l.filter((x) => x.id !== inv.id)))
      .catch(() => live && (setFailed(true), setOthers([])));
    return () => {
      live = false;
    };
  }, [inv.id]);

  const ranked = useMemo(() => (others ? rankSimilar(inv, others, 5) : []), [inv, others]);

  function copy(source: CauseNode, fromId: string) {
    const node = copyOfCause(source, uid());
    update((i) => ({
      ...i,
      tree: addChild(i.tree, parentId, node),
    }));
    setCopied((c) => new Set(c).add(`${fromId}:${source.id}`));
    setMessage(
      `Added "${clip(source.text, 80)}" to your cause tree as a hypothesis. It is not verified until you link evidence.`,
    );
    onAdded?.(node.id);
  }

  return (
    <SectionCard
      collapseOnMobile
      title="Similar past failures"
      help="Your other investigations that look like this one, best match first. Matches use the asset tag, asset type, failure mode and the words in the title and description."
    >
      {others === null ? (
        <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
      ) : failed ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          Could not read your other investigations just now.
        </p>
      ) : ranked.length === 0 ? (
        <div data-testid="similar-empty" className="rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">No similar failures yet</p>
          <p className="mt-1 max-w-prose">
            {others.length === 0
              ? "This list builds up as you add investigations. Each new one is compared with the ones you already have, so the more failures you record, the more this shows you."
              : `None of your other ${others.length} ${others.length === 1 ? "investigation looks" : "investigations look"} like this one yet. Filling in the asset tag, asset type and failure mode helps find matches.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-4" data-testid="similar-list">
          {ranked.map(({ inv: o, similarity, status, rootCauses, doneActions, fixVerified }) => (
            <li key={o.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4" data-testid="similar-item">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="text-base font-semibold leading-snug text-slate-900">
                    {o.problem.title || "Untitled investigation"}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {[o.problem.assetTag, o.problem.assetType || o.problem.asset].filter(Boolean).join(" · ") ||
                      "No asset recorded"}
                    {o.problem.eventDate && ` · ${formatDate(o.problem.eventDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <Link href={`/app/investigations/${o.id}`} className="btn btn-dark btn-sm">
                    Open
                  </Link>
                </div>
              </div>

              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Why it matches">
                {similarity.reasons.map((r) => (
                  <li key={r.code} className="chip bg-white text-slate-700 ring-1 ring-inset ring-slate-300">
                    {r.label}
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="eyebrow">Root causes</p>
                  {rootCauses.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-600">No root cause flagged.</p>
                  ) : (
                    <ul className="mt-1 space-y-2">
                      {rootCauses.slice(0, 4).map((r) => {
                        const key = `${o.id}:${r.id}`;
                        const done = copied.has(key);
                        return (
                          <li key={r.id} className="text-sm text-slate-800">
                            <p>{clip(r.text || "(no text)", 200)}</p>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm mt-1"
                              disabled={done}
                              onClick={() => copy(r, o.id)}
                            >
                              {done ? (
                                <>
                                  <Icon name="check" size={14} /> Copied
                                </>
                              ) : (
                                <>
                                  <Icon name="copy" size={14} /> Copy this cause into my tree
                                </>
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {rootCauses.length > 4 && (
                        <li className="text-sm text-slate-600">+ {rootCauses.length - 4} more in the investigation</li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="flex flex-wrap items-center gap-2 eyebrow">
                    What fixed it
                    {doneActions.length > 0 &&
                      (fixVerified ? (
                        <span className="chip bg-emerald-100 normal-case tracking-normal text-emerald-800">Fix verified</span>
                      ) : (
                        <span className="chip bg-slate-200 normal-case tracking-normal text-slate-700">Fix not yet verified</span>
                      ))}
                  </p>
                  {doneActions.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-600">No completed actions yet.</p>
                  ) : (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
                      {doneActions.slice(0, 4).map((a) => (
                        <li key={a.id}>{clip(a.description || "(no description)", 160)}</li>
                      ))}
                      {doneActions.length > 4 && (
                        <li className="list-none text-slate-600">+ {doneActions.length - 4} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p role="status" data-testid="copy-message" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="min-w-0 flex-1 basis-60">{message}</span>
          {onOpenTree && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenTree}>
              Open the cause tree
            </button>
          )}
        </p>
      )}
    </SectionCard>
  );
}
