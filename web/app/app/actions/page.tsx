import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionsPage } from "@/components/actions/ActionsPage";

export const metadata: Metadata = { title: "Actions" };

export default function Actions() {
  return (
    <Suspense fallback={null}>
      <ActionsPage />
    </Suspense>
  );
}
