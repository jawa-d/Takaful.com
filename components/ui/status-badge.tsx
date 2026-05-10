import { RequestStatus } from "@/types";
import { cn } from "@/lib/utils";

const map: Record<RequestStatus, string> = {
  "Draft": "bg-slate-500/20 text-slate-200",
  "Pending Review": "bg-amber-500/20 text-amber-200",
  "Approved": "bg-emerald-500/20 text-emerald-200",
  "Rejected": "bg-rose-500/20 text-rose-200",
  "Archived": "bg-indigo-500/20 text-indigo-200",
};

const labels: Record<RequestStatus, string> = {
  "Draft": "مسودة",
  "Pending Review": "بانتظار المراجعة",
  "Approved": "موافق عليه",
  "Rejected": "مرفوض",
  "Archived": "مؤرشف",
};

export const StatusBadge = ({ status }: { status: RequestStatus }) => (
  <span className={cn("rounded-full px-2.5 py-1 text-xs", map[status])}>{labels[status]}</span>
);
