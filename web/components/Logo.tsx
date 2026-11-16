import { BRAND_NAME } from "@/lib/brand";
import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#f59e0b" />
      <path
        d="M9 16a7 7 0 0112.2-4.7M23 16a7 7 0 01-12.2 4.7"
        fill="none"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M21.5 7.5v5h-5M10.5 24.5v-5h5" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", light = true }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-bold tracking-tight">
      <LogoMark />
      <span className={light ? "text-white" : "text-slate-900"}>{BRAND_NAME}</span>
    </Link>
  );
}
