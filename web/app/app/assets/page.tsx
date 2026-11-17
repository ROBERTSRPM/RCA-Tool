import type { Metadata } from "next";
import { AssetsPage } from "@/components/assets/AssetsPage";

export const metadata: Metadata = { title: "Assets" };

export default function Assets() {
  return <AssetsPage />;
}
