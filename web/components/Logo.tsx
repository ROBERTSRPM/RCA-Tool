import { BRAND_BYLINE, BRAND_NAME } from "@/lib/brand";
import Link from "next/link";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#161a21" />
      <path
        d="M9 16a7 7 0 0112.2-4.7M23 16a7 7 0 01-12.2 4.7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <path
        d="M21.5 7.5v5h-5M10.5 24.5v-5h5"
        fill="none"
        stroke="#ea580c"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wordmark. `light` is for use on a dark background. */
export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
      <LogoMark />
      <span className={light ? "text-white" : "text-slate-900"}>
        {BRAND_NAME}{" "}
        <span className={`text-xs font-normal ${light ? "text-slate-400" : "text-slate-500"}`}>{BRAND_BYLINE}</span>
      </span>
    </Link>
  );
}
