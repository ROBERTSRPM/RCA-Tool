"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getStore } from "@/lib/store";
import { Icon } from "./icons";

export function StartNewButton({
  label = "Start a new investigation",
  variant = "primary",
  className = "",
}: {
  label?: string;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`btn ${
        variant === "primary" ? "btn-primary" : variant === "dark" ? "btn-dark" : "btn-secondary"
      } ${className}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const inv = await getStore().create();
          router.push(`/app/investigations/${inv.id}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name="plus" />
      {label}
    </button>
  );
}
