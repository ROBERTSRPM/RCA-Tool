import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BRAND_NAME, BRAND_TITLE } from "@/lib/brand";

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: BRAND_TITLE, template: `%s · ${BRAND_NAME}` },
  description:
    "Root Cause Analysis for Maintenance, Operations and Plant Teams. Find the cause, put a cost on it, and check the fix held.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
