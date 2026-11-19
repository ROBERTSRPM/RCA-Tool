import { SUPPORT_EMAIL } from "./brand";
import type { RawRow } from "./store/types";

/** The JSON document written by "Download my data". */
export function buildExport(
  rows: RawRow[],
  email: string | null,
  now = new Date(),
  assets: RawRow[] = [],
) {
  return {
    exportedAt: now.toISOString(),
    account: email,
    format: "rootloop-export-v1",
    count: rows.length,
    investigations: rows,
    /** The asset register (added later; an older export simply has no such key). */
    assetCount: assets.length,
    assets,
  };
}

export function exportFileName(now = new Date()): string {
  return `rca-pilot-my-data-${now.toISOString().slice(0, 10)}.json`;
}

export const DELETE_PHRASE = "DELETE";

/** True when the typed text confirms account deletion. */
export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim() === DELETE_PHRASE;
}

export const DELETE_UNAVAILABLE_MESSAGE =
  "Account deletion is not available on this server yet (the delete_own_account database function is not installed). Nothing was deleted. Write to " + SUPPORT_EMAIL + ".";

/** Plain message for a failed account deletion, or the unavailable message when the function does not exist. */
export function deleteAccountError(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  const msg = (error?.message ?? "").toLowerCase();
  if (
    error?.code === "PGRST202" ||
    error?.code === "42883" ||
    error?.status === 404 ||
    msg.includes("could not find the function") ||
    msg.includes("delete_own_account") && msg.includes("does not exist")
  ) {
    return DELETE_UNAVAILABLE_MESSAGE;
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("abort") || msg.includes("timed out")) {
    return "Could not delete your account: no connection to the server. Nothing was deleted.";
  }
  if (error?.status === 401 || msg.includes("jwt") || msg.includes("not authenticated")) {
    return "Your session has expired. Sign in again, then try deleting your account.";
  }
  return "Could not delete your account. Nothing was deleted. Try again, or write to " + SUPPORT_EMAIL + ".";
}
