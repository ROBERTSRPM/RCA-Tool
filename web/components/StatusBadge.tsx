import { STATUS_LABELS } from "@/lib/status";
import type { InvestigationStatus } from "@/lib/types";

/** Neutral chip with a coloured dot: status reads from the label first, colour second. */
const DOT: Record<InvestigationStatus, string> = {
  draft: "bg-slate-400",
  investigating: "bg-sky-600",
  actions: "bg-amber-500",
  verifying: "bg-violet-600",
  closed: "bg-emerald-600",
};

export function StatusBadge({ status }: { status: InvestigationStatus }) {
  return (
    <span className="chip gap-1.5 bg-white text-slate-800 ring-1 ring-inset ring-slate-300">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
