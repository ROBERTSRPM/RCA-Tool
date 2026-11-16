"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  // A ref, not state: two clicks in the same instant must still create only one.
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
    <button
      className={`btn ${
        variant === "primary" ? "btn-primary" : variant === "dark" ? "btn-dark" : "btn-secondary"
      } ${className}`}
      disabled={busy}
      onClick={async () => {
        if (locked.current) return;
        locked.current = true;
        setBusy(true);
        setError(null);
        try {
          const inv = await getStore().create();
          // Stay locked on success: the page is navigating away, and a second
          // click that lands after the record exists must not make another one.
          router.push(`/app/investigations/${inv.id}`);
        } catch (e) {
          setError(e instanceof Error && e.message ? e.message : "Could not create the investigation.");
          setBusy(false);
          locked.current = false;
        }
      }}
    >
      <Icon name="plus" />
      {label}
    </button>
    {error && (
      <span role="alert" className="text-sm font-medium text-red-600">
        {error}
      </span>
    )}
    </>
  );
}
