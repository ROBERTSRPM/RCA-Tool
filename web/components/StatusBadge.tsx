import { STATUS_LABELS } from "@/lib/status";
import type { InvestigationStatus } from "@/lib/types";

const STYLES: Record<InvestigationStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-300",
  investigating: "bg-sky-50 text-sky-800 ring-sky-200",
  actions: "bg-amber-50 text-amber-900 ring-amber-300",
  verifying: "bg-violet-50 text-violet-800 ring-violet-200",
  closed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function StatusBadge({ status }: { status: InvestigationStatus }) {
  return (
    <span className={`chip ring-1 ring-inset ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
