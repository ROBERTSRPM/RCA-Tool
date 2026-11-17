"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  buildExport,
  DELETE_PHRASE,
  deleteAccountError,
  exportFileName,
  isDeleteConfirmed,
} from "@/lib/account";
import {
  friendlyAuthError,
  PASSWORD_RULE_HINT,
  validateNewPassword,
  validatePasswordMatch,
} from "@/lib/auth/validate";
import { flushAllPending } from "@/lib/pending";
import { getAssetStore, getLocalStore, getStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { useConfirm } from "../ui";
import { FormError, FormField } from "./AuthFrame";
import { useAuth } from "./AuthProvider";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-slate-700">{children}</div>
    </section>
  );
}

/** Saves every investigation (as stored) to one JSON file, entirely in the browser. */
function DownloadData({ email }: { email: string | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function download() {
    setBusy(true);
    setMsg(null);
    try {
      await flushAllPending();
      const rows = await getStore().exportAll();
      // The register is part of the export; a server without the table just has none.
      const assets = await getAssetStore().exportAll().catch(() => []);
      const doc = buildExport(rows, email, new Date(), assets);
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMsg({
        ok: true,
        text: `Downloaded ${rows.length} ${rows.length === 1 ? "investigation" : "investigations"} and ${assets.length} ${assets.length === 1 ? "asset" : "assets"}.`,
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error && e.message ? e.message : "Could not download your data." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        One JSON file with all your investigations (including photos) and your asset register. It is created in your
        browser; nothing is sent anywhere else.
      </p>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={download}>
        {busy ? "Preparing…" : "Download my data"}
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "font-medium text-emerald-800" : "font-medium text-red-700"}>
          {msg.text}
        </p>
      )}
    </>
  );
}

function ChangePassword({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const pwErr = touched.password ? validateNewPassword(password, email) : null;
  const confirmErr = touched.confirm ? validatePasswordMatch(password, confirm) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    setDone(false);
    if (validateNewPassword(password, email) || validatePasswordMatch(password, confirm)) return;
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setError(null);
    const { error: err } = await db.auth.updateUser({ password });
    if (err) {
      setBusy(false);
      setError(friendlyAuthError(err, "login"));
      return;
    }
    // Everyone who held the old password or an old session is signed out; this device stays in.
    const { error: outErr } = await db.auth.signOut({ scope: "others" });
    setBusy(false);
    setPassword("");
    setConfirm("");
    setTouched({ password: false, confirm: false });
    if (outErr) {
      setError("Your password was changed, but we could not sign out your other devices. Use Sign out to end all sessions.");
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-4" aria-label="Change password">
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_RULE_HINT}
        value={password}
        onChange={setPassword}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        error={pwErr}
      />
      <FormField
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
        error={confirmErr}
      />
      <FormError message={error} />
      {done && (
        <p role="status" className="font-medium text-emerald-800">
          Password changed. Your other devices and browsers have been signed out.
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!isDeleteConfirmed(typed)) return;
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setError(null);
    const { error: err } = await db.rpc("delete_own_account");
    if (err) {
      setBusy(false);
      setError(deleteAccountError(err));
      return;
    }
    // The user no longer exists: end the session here and go back to the landing page.
    try {
      await signOut();
    } catch {
      /* the account is gone either way */
    }
    router.replace("/?deleted=1");
  }

  return (
    <form onSubmit={remove} noValidate className="max-w-md space-y-3" aria-label="Delete my account">
      <p>
        This permanently deletes your account, every investigation in it (including photos) and your asset register.
        It cannot be undone. Download your data first if you want a copy.
      </p>
      <FormField
        label={`Type ${DELETE_PHRASE} to confirm`}
        name="confirm-delete"
        autoComplete="off"
        value={typed}
        onChange={setTyped}
      />
      <FormError message={error} />
      <button type="submit" className="btn btn-danger" disabled={busy || !isDeleteConfirmed(typed)}>
        {busy ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}

function ClearBrowserData() {
  const confirm = useConfirm();
  const [done, setDone] = useState(false);
  async function clear() {
    const ok = await confirm({
      title: "Clear browser data?",
      message:
        "Every investigation saved in this browser will be permanently deleted. Download your data first if you want a copy. A fresh sample investigation will appear the next time you open the app.",
      confirmLabel: "Clear browser data",
      danger: true,
    });
    if (!ok) return;
    getLocalStore().clearAll();
    setDone(true);
  }
  return (
    <>
      <p>
        In demo mode your investigations live only in this browser. Clearing removes them from
        this device for good.
      </p>
      <button type="button" className="btn btn-danger" onClick={clear}>
        Clear browser data
      </button>
      {done && (
        <p role="status" className="font-medium text-emerald-800">
          Browser data cleared.{" "}
          <Link href="/app" className="underline">
            Back to investigations
          </Link>
        </p>
      )}
    </>
  );
}

export function AccountPage() {
  const { state, configured } = useAuth();
  const signedIn = state.status === "in";
  const email = state.status === "in" ? state.user.email : null;
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="h-page">Account</h1>
        {signedIn ? (
          <p className="mt-1 text-sm text-slate-600">
            Signed in as <strong data-testid="account-page-email">{email}</strong>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">
            You are in demo mode: your work is saved only in this browser.{" "}
            {configured && (
              <>
                <Link href="/signup" className="font-semibold underline">
                  Create a free account
                </Link>{" "}
                or{" "}
                <Link href="/login" className="font-semibold underline">
                  sign in
                </Link>{" "}
                to keep it.
              </>
            )}
          </p>
        )}
      </div>

      <Section title="Your data">
        <DownloadData email={email} />
      </Section>

      {signedIn && email ? (
        <>
          <Section title="Change password">
            <ChangePassword email={email} />
          </Section>
          <Section title="Delete my account">
            <DeleteAccount />
          </Section>
        </>
      ) : (
        <Section title="Browser data">
          <ClearBrowserData />
        </Section>
      )}
    </main>
  );
}
