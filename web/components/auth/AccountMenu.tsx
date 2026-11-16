"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushAllPending } from "@/lib/pending";
import { Icon } from "../icons";
import { useConfirm } from "../ui";
import { useAuth } from "./AuthProvider";

/** Header control: sign in / create account when signed out, email menu when signed in. */
export function AccountMenu({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { state, configured, signOut } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!configured || state.status === "loading") return null;

  const text = tone === "dark" ? "text-slate-200 hover:bg-slate-800" : "text-slate-800 hover:bg-slate-200";

  if (state.status === "out") {
    return (
      <div className="flex items-center gap-1">
        <Link href="/login" className={`btn btn-sm ${text}`}>
          Sign in
        </Link>
        <Link href="/signup" className="btn btn-primary btn-sm">
          Create account
        </Link>
      </div>
    );
  }

  async function doSignOut() {
    setBusy(true);
    try {
      const saved = await flushAllPending();
      if (!saved) {
        const ok = await confirm({
          title: "Some changes could not be saved",
          message:
            "Your latest edits have not reached your account yet. If you sign out now they will be lost.",
          confirmLabel: "Sign out anyway",
          danger: true,
        });
        if (!ok) return;
      }
      await signOut();
      setOpen(false);
      router.push("/app");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu, signed in as ${state.user.email}`}
        onClick={() => setOpen((o) => !o)}
        className={`btn btn-sm gap-2 ${text}`}
        data-testid="account-menu-button"
      >
        <Icon name="user" size={16} />
        <span className="max-w-[110px] truncate sm:max-w-[220px]">{state.user.email}</span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Signed in as
            </p>
            <p className="truncate text-sm font-semibold" data-testid="account-email">
              {state.user.email}
            </p>
          </div>
          <Link
            role="menuitem"
            href="/app"
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-slate-100"
          >
            My investigations
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={busy}
            onClick={doSignOut}
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
