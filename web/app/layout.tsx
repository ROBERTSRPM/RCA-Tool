import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "RootLoop: the root cause tool that closes the loop",
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
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
