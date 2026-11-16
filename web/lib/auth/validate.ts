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

/** For choosing a password (sign-up and reset). */
export function validateNewPassword(password: string): string | null {
  if (!password) return "Choose a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
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

/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
