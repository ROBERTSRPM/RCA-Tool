import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** https:// and wss:// origins for the Supabase project, or none in local-only mode. */
function supabaseOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return [];
    return [`https://${u.host}`, `wss://${u.host}`];
  } catch {
    return [];
  }
}

/*
 * Content Security Policy. Pages are statically generated, so a per-request
 * nonce is not possible; Next.js writes small inline bootstrap scripts into
 * every page, hence 'unsafe-inline' for scripts (still no eval, no remote
 * script hosts). Styles: all CSS is served from /_next/static, so <style>
 * elements stay limited to 'self'; only inline style="" attributes (React
 * style props for widths and sizes) are allowed. Development adds
 * 'unsafe-eval' because React's dev tooling needs it; production does not.
 */
function contentSecurityPolicy(): string {
  const connect = ["'self'", ...supabaseOrigins()];
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self'" + (isDev ? " 'unsafe-inline'" : ""),
    "style-src-attr 'unsafe-inline'",
    `connect-src ${connect.join(" ")}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "serial=()",
      "hid=()",
      "midi=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "display-capture=()",
      "browsing-topics=()",
      "interest-cohort=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
