import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BRAND_NAME, BRAND_TITLE } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: BRAND_TITLE, template: `%s · ${BRAND_NAME}` },
  description:
    "Investigate failures quickly with guidance, track every action to done, and prove the failure stopped, with the money quantified.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
