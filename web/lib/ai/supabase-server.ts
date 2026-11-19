/** Server-side Supabase calls for the AI routes: verify the session token, count the call. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { interpretConsume, type ConsumeDecision, type Limits } from "./limits";

function clientFor(token: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Verifies the access token with Supabase (not just decoding it). Null when signed out or invalid. */
export async function verifyUser(token: string): Promise<{ id: string } | null> {
  const db = clientFor(token);
  if (!db) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

/** Counts one AI call for the signed-in user and applies the limits. Throws if the database is unreachable. */
export async function consumeCall(token: string, feature: string, limits: Limits): Promise<ConsumeDecision> {
  const db = clientFor(token);
  if (!db) throw new Error("no database");
  const { data, error } = await db.rpc("ai_consume", {
    p_feature: feature,
    p_daily: limits.daily,
    p_burst: limits.burst,
    p_global: limits.global,
  });
  if (error) throw new Error("limit check failed");
  return interpretConsume(data);
}

/** Gives back a call that failed on our side, using the ticket the server got from ai_consume. Best effort: never throws. */
export async function refundCall(token: string, usageId: number, ticket: string): Promise<void> {
  try {
    const db = clientFor(token);
    if (db) await db.rpc("ai_refund", { p_id: usageId, p_ticket: ticket });
  } catch {
    // Not refunding is the safe failure.
  }
}
