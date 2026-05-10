"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from "@tanstack/react-table";
import { useAppStore } from "@/store/app-store";
import { StatusBadge } from "@/components/ui/status-badge";
import { currency } from "@/utils";
import { RequestStatus, RequestType } from "@/types";

export default function RequestsPage() {
  const requests = useAppStore((s) => s.requests);
  const session = useAppStore((s) => s.session);
  const clearAllRequests = useAppStore((s) => s.clearAllRequests);
  const canDeleteAll = session?.role === "Manager";
  const [query, setQuery] = useState("");
  const [grid, setGrid] = useState(false);
  const [status, setStatus] = useState<"all" | RequestStatus>("all");
  const [requestType, setRequestType] = useState<"all" | RequestType>("all");
  const [priority, setPriority] = useState<"all" | "Low" | "Medium" | "High" | "Critical">("all");
  const [currencyCode, setCurrencyCode] = useState<"all" | "USD" | "IQD">("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const q = query.trim().toLowerCase();
        const matchQuery = !q || `${r.requestId} ${r.title} ${r.employeeName} ${r.department}`.toLowerCase().includes(q);
        const matchStatus = status === "all" || r.status === status;
        const matchType = requestType === "all" || r.requestType === requestType;
        const matchPriority = priority === "all" || r.priority === priority;
        const matchCurrency = currencyCode === "all" || r.currency === currencyCode;
        const min = minAmount ? Number(minAmount) : null;
        const max = maxAmount ? Number(maxAmount) : null;
        const matchMin = min === null || r.amount >= min;
        const matchMax = max === null || r.amount <= max;
        return matchQuery && matchStatus && matchType && matchPriority && matchCurrency && matchMin && matchMax;
      }),
    [requests, query, status, requestType, priority, currencyCode, minAmount, maxAmount]
  );

  const c = createColumnHelper<(typeof filtered)[number]>();
  const table = useReactTable({
    data: filtered,
    columns: [
      c.accessor("requestId", { header: "رقم الطلب" }),
      c.accessor("title", { header: "العنوان" }),
      c.accessor("status", { header: "الحالة", cell: (i) => <StatusBadge status={i.getValue()} /> }),
      c.display({
        id: "route",
        header: "المراجع الحالي",
        cell: (i) => {
          const r = i.row.original;
          if (r.status !== "Pending Review") return <span className="text-xs text-white/50">-</span>;
          return <span className="text-xs text-cyan-200">CEO</span>;
        },
      }),
      c.display({ id: "amount", header: "المبلغ", cell: (i) => currency(i.row.original.amount, i.row.original.currency) }),
      c.display({ id: "open", cell: (i) => <Link href={`/requests/${i.row.original.id}`} className="text-cyan-300">فتح</Link> }),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setRequestType("all");
    setPriority("all");
    setCurrencyCode("all");
    setMinAmount("");
    setMaxAmount("");
  };

  const onDeleteAll = () => {
    if (!canDeleteAll) return;
    const ok = window.confirm("هل أنت متأكد من حذف جميع الطلبات؟ لا يمكن التراجع.");
    if (!ok) return;
    clearAllRequests(session.role);
  };

  return <div className="space-y-3"><div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3"><div className="grid gap-2 md:grid-cols-4"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث برقم/عنوان/موظف/قسم" className="rounded-xl border border-white/15 bg-black/20 p-2 md:col-span-2" /><select value={status} onChange={(e) => setStatus(e.target.value as "all" | RequestStatus)} className="rounded-xl border border-white/15 bg-black/20 p-2"><option value="all">كل الحالات</option><option value="Draft">مسودة</option><option value="Pending Review">بانتظار المراجعة</option><option value="Approved">موافق</option><option value="Rejected">مرفوض</option><option value="Archived">مؤرشف</option></select><select value={requestType} onChange={(e) => setRequestType(e.target.value as "all" | RequestType)} className="rounded-xl border border-white/15 bg-black/20 p-2"><option value="all">كل الأنواع</option><option value="Financial">Financial</option><option value="Internal Approval">Internal Approval</option><option value="Administrative">Administrative</option><option value="Purchase">Purchase</option><option value="HR">HR</option></select><select value={priority} onChange={(e) => setPriority(e.target.value as "all" | "Low" | "Medium" | "High" | "Critical")} className="rounded-xl border border-white/15 bg-black/20 p-2"><option value="all">كل الأولويات</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select><select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value as "all" | "USD" | "IQD")} className="rounded-xl border border-white/15 bg-black/20 p-2"><option value="all">كل العملات</option><option value="USD">USD</option><option value="IQD">IQD</option></select><input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="أقل مبلغ" className="rounded-xl border border-white/15 bg-black/20 p-2" /><input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="أعلى مبلغ" className="rounded-xl border border-white/15 bg-black/20 p-2" /></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="text-xs text-white/65">النتائج: {filtered.length} من {requests.length}</div><div className="flex flex-wrap gap-2"><button onClick={clearFilters} className="rounded-xl border border-white/15 px-3 py-1.5 text-xs">تفريغ الفلاتر</button><button onClick={() => setGrid(!grid)} className="rounded-xl border border-white/15 px-3 py-1.5 text-xs">{grid ? "عرض جدول" : "عرض بطاقات"}</button>{canDeleteAll && <button onClick={onDeleteAll} className="rounded-xl border border-rose-400/50 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">حذف جميع الطلبات</button>}</div></div></div>{filtered.length === 0 ? <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">لا توجد نتائج مطابقة للفلاتر الحالية.</div> : grid ? <div className="grid gap-3 md:grid-cols-3">{filtered.map((r) => <Link key={r.id} href={`/requests/${r.id}`} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"><div className="text-xs text-white/60">{r.requestId}</div><div className="mt-1 font-cairo">{r.title}</div><div className="mt-2 text-xs text-white/70">{currency(r.amount, r.currency)}</div><div className="mt-1 text-xs text-cyan-200">{r.status === "Pending Review" ? "بانتظار: CEO" : ""}</div><div className="mt-2"><StatusBadge status={r.status} /></div></Link>)}</div> : <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[760px] text-sm"><thead className="bg-white/5">{table.getHeaderGroups().map((hg) => <tr key={hg.id}>{hg.headers.map((h) => <th key={h.id} className="px-3 py-2 text-right">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-t border-white/10">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>}</div>;
}
