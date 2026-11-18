"use client";

/** Browser side of the AI routes: sends the signed-in user's token to our own /api/ai/* and nothing else. */
import { BRAND_NAME } from "../brand";
import { getSupabase } from "../supabase/client";
import type { AiFeature } from "./requests";

export type AiOutcome<T> =
  | { ok: true; result: T; remainingToday: number }
  | { ok: false; code: string; message: string };

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";

export async function callAi<T>(feature: AiFeature, body: Record<string, unknown>): Promise<AiOutcome<T>> {
  const db = getSupabase();
  const { data } = db ? await db.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return { ok: false, code: "signin", message: "Sign in to use AI." };
  try {
    const res = await fetch(`/api/ai/${feature}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(65_000),
    });
    const json = (await res.json().catch(() => null)) as {
      result?: T;
      remainingToday?: number;
      error?: { code?: string; message?: string };
    } | null;
    if (res.ok && json && json.result !== undefined) {
      return { ok: true, result: json.result, remainingToday: json.remainingToday ?? 0 };
    }
    return {
      ok: false,
      code: json?.error?.code ?? "unavailable",
      message: json?.error?.message ?? `The AI is not available right now. Everything else in ${BRAND_NAME} still works.`,
    };
  } catch {
    return { ok: false, code: "network", message: NETWORK_MESSAGE };
  }
}
