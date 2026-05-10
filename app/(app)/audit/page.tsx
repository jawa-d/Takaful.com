"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { formatDate } from "@/utils";
import { exportAuditCsv } from "@/lib/export";
import { AuditAction } from "@/types";

const actionLabels: Record<AuditAction, string> = {
  USER_LOGIN: "تسجيل دخول",
  USER_LOGOUT: "تسجيل خروج",
  REQUEST_CREATED: "إنشاء طلب",
  REQUEST_UPDATED: "تعديل طلب",
  REQUEST_STATUS_CHANGED: "تغيير حالة",
  REQUEST_DELETED: "حذف طلب",
  REQUESTS_CLEARED: "حذف جميع الطلبات",
  REQUEST_ARCHIVED: "أرشفة طلب",
  REQUEST_RESTORED: "استرجاع طلب",
};

export default function AuditPage() {
  const logs = useAppStore((s) => s.auditLogs);
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState<"all" | AuditAction>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const actors = useMemo(() => Array.from(new Set(logs.map((l) => l.actor))), [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const q = query.trim().toLowerCase();
      const matchQuery = !q || `${l.actor} ${l.details} ${l.requestCode || ""}`.toLowerCase().includes(q);
      const matchAction = action === "all" || l.action === action;
      const matchActor = actor === "all" || l.actor === actor;

      const at = new Date(l.at).getTime();
      const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
      const matchFrom = from === null || at >= from;
      const matchTo = to === null || at <= to;

      return matchQuery && matchAction && matchActor && matchFrom && matchTo;
    });
  }, [logs, query, action, actor, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-cairo text-xl">سجل الحركات</h1>
          <button onClick={() => exportAuditCsv(filtered)} className="rounded-xl bg-[#0038a8] px-3 py-2 text-xs">تصدير CSV</button>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم / التفاصيل / رقم الطلب"
            className="rounded-xl border border-white/15 bg-black/20 p-2 md:col-span-2"
          />

          <select value={actor} onChange={(e) => setActor(e.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-2">
            <option value="all">كل المستخدمين</option>
            {actors.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select value={action} onChange={(e) => setAction(e.target.value as "all" | AuditAction)} className="rounded-xl border border-white/15 bg-black/20 p-2">
            <option value="all">كل الإجراءات</option>
            {Object.entries(actionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-2" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-white/15 bg-black/20 p-2" />
          <button
            onClick={() => {
              setQuery("");
              setActor("all");
              setAction("all");
              setFromDate("");
              setToDate("");
            }}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs"
          >
            تفريغ الفلاتر
          </button>
        </div>

        <div className="mt-2 text-xs text-white/65">عدد السجلات: {filtered.length}</div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4 text-sm text-white/60">لا توجد سجلات مطابقة.</div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-cyan-200">{actionLabels[log.action] || log.action}</span>
                {log.requestCode && <span className="text-white/75">{log.requestCode}</span>}
              </div>
              <div className="mt-1 text-sm text-white/90">{log.details}</div>
              <div className="mt-1 text-xs text-white/60">{log.actor} · {log.role} · {formatDate(log.at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
