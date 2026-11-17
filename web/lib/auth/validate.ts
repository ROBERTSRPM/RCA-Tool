export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an error message, or null when the email looks valid. */
export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return "Enter your email address.";
  if (!EMAIL_RE.test(v)) return "That does not look like an email address. Check for typos.";
  return null;
}

/** For signing in we only require that something was typed. */
export function validateLoginPassword(password: string): string | null {
  return password ? null : "Enter your password.";
}

/** The rule, in one sentence, shown next to every "choose a password" field. */
export const PASSWORD_RULE_HINT =
  "At least 8 characters. Not a very common password, and not your email address.";

/**
 * A short list of very common passwords (all lower case, at least 8 characters
 * so they pass the length rule on their own). This is a convenience check in
 * the browser; the real minimum and any breached-password check are enforced by
 * the Supabase Auth settings.
 */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
  "12345678", "123456789", "1234567890", "123123123", "11111111", "00000000", "87654321",
  "qwertyui", "qwerty123", "qwertyuiop", "qwerty12", "1q2w3e4r", "1qaz2wsx", "q1w2e3r4",
  "abcd1234", "abc12345", "abcdefgh", "asdfghjk", "asdf1234", "zxcvbnm1",
  "iloveyou", "welcome1", "welcome123", "letmein1", "letmein123", "admin123", "administrator",
  "changeme", "changeme123", "trustno1", "football", "baseball", "monkey123", "dragon123",
  "sunshine", "princess", "superman", "master123", "starwars", "whatever", "shadow123",
  "rootloop", "rootloop1", "rootloop123",
]);

/**
 * For choosing a password (sign-up, reset, change). Pass the account email to
 * also reject a password equal to it.
 */
export function validateNewPassword(password: string, email?: string | null): string | null {
  if (!password) return "Choose a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  const lower = password.toLowerCase();
  if (email && lower === email.trim().toLowerCase()) {
    return "The password must not be the same as your email address.";
  }
  if (COMMON_PASSWORDS.has(lower)) {
    return "That password is too common. Choose something harder to guess.";
  }
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  return password === confirm ? null : "The two passwords do not match.";
}

export type AuthContext = "login" | "signup" | "forgot" | "reset" | "resend";

/** Maps a raw Supabase auth error to something a person can act on. */
export function friendlyAuthError(
  error: { message?: string; code?: string; status?: number } | null | undefined,
  context: AuthContext,
): string {
  const msg = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "That email and password do not match. Check them and try again, or reset your password.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Your email address is not confirmed yet. Open the confirmation email we sent you, then sign in.";
  }
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    error?.status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("security purposes")
  ) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (code === "weak_password" || msg.includes("password should be")) {
    return `That password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters and avoid common words.`;
  }
  if (code === "user_already_exists" || msg.includes("already registered")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (code === "same_password" || msg.includes("different from the old password")) {
    return "Choose a password you have not used before.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (context === "reset" && (msg.includes("session") || msg.includes("expired"))) {
    return "This reset link has expired. Request a new one.";
  }
  return "Something went wrong. Please try again.";
}

/** Characters never allowed in a redirect target: C0 controls, DEL, backslash. */
const FORBIDDEN_RE = /[\u0000-\u001f\u007f\\]/;

/** Stands in for the site origin where none is supplied (tests, server rendering). */
const PLACEHOLDER_ORIGIN = "https://site.invalid";

/**
 * Only same-origin relative paths are allowed as a post-login destination.
 * The value is rejected when it contains control characters (a tab or newline
 * is stripped by browsers, which turns "/<TAB>/host" into "//host") or
 * backslashes, when it does not start with a single "/", or when it parses to
 * another origin. The same checks run on the percent-decoded value. The result
 * is rebuilt from the parsed URL, never the raw input.
 */
export function safeNext(
  next: string | null | undefined,
  fallback = "/app",
  origin: string = PLACEHOLDER_ORIGIN,
): string {
  if (typeof next !== "string" || !next) return fallback;
  if (FORBIDDEN_RE.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (FORBIDDEN_RE.test(decoded) || decoded.startsWith("//")) return fallback;
  try {
    const site = new URL(origin).origin;
    const u = new URL(next, site);
    if (u.origin !== site) return fallback;
    // Dot segments are resolved by the parser, so "/app/..//host" becomes the
    // path "//host". Returned as-is, a browser would read that as a
    // protocol-relative URL to another host. Check the normalised result too.
    const out = u.pathname + u.search + u.hash;
    if (!out.startsWith("/") || out.startsWith("//") || FORBIDDEN_RE.test(out)) return fallback;
    if (new URL(out, site).origin !== site) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
