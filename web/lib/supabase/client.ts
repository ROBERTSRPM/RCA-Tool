import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when the build has Supabase configured. Otherwise the app is local-only. */
export const isSupabaseConfigured = Boolean(URL && KEY);

/** Gives up on a request after 10 s so the UI can report a lost connection promptly. */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return fetch(input, init);
  }
  const timeout = AbortSignal.timeout(10000);
  const signal =
    init?.signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, timeout])
      : (init?.signal ?? timeout);
  return fetch(input, { ...init, signal });
}

let client: SupabaseClient | null = null;

/** The shared browser client, or null in local-only mode (and during SSR). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(URL!, KEY!, {
      global: { fetch: fetchWithTimeout },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
