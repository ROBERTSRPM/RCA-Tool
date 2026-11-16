"use client";

import Link from "next/link";
import { useLoadedInvestigation } from "@/lib/hooks";
import { Workspace } from "./Workspace";

export function WorkspaceLoader({ id }: { id: string }) {
  const state = useLoadedInvestigation(id);
  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-14 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }
  if (state.status === "missing") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="h-page">Investigation not found</h1>
        <p className="mt-2 text-slate-600">
          It may have been deleted, or it was saved in a different browser. Your investigations
          are stored in the browser you created them in.
        </p>
        <Link href="/app" className="btn btn-primary mt-6">
          Back to all investigations
        </Link>
      </main>
    );
  }
  return <Workspace key={state.inv.id} initial={state.inv} />;
}
