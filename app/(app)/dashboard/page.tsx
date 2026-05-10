"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppStore } from "@/store/app-store";
import { currency, formatDate } from "@/utils";
import { ResponsiveContainer, LineChart, Line, Tooltip, BarChart, Bar, XAxis } from "recharts";
import { exportKpiReport, exportRequestsCsv } from "@/lib/export";

export default function DashboardPage() {
  const requests = useAppStore((s) => s.requests);

  const openRequests = requests
    .filter((r) => r.status === "Draft" || r.status === "Pending Review")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  const criticalOpen = openRequests.filter((r) => r.priority === "Critical" || r.priority === "High");
  const recentOpen = openRequests.slice(0, 6);

  const byType = ["Financial", "Internal Approval", "Administrative", "Purchase", "HR"].map((t) => ({
    name: t,
    value: requests.filter((r) => r.requestType === t).length,
  }));

  const kpis = {
    "إجمالي الطلبات": requests.length,
    "الطلبات المفتوحة": openRequests.length,
    "بانتظار المراجعة": requests.filter((r) => r.status === "Pending Review").length,
    "الموافق عليها": requests.filter((r) => r.status === "Approved").length,
    "عالية الأولوية (مفتوح)": criticalOpen.length,
    "إجمالي بالدولار": requests.filter((r) => r.currency === "USD").reduce((a, b) => a + b.amount, 0),
    "إجمالي بالدينار": requests.filter((r) => r.currency === "IQD").reduce((a, b) => a + b.amount, 0),
  };

  const series = ["Draft", "Pending Review", "Approved", "Rejected", "Archived"].map((s) => ({
    name: s,
    value: requests.filter((r) => r.status === s).length,
  }));

  const approvalRate = requests.length ? Math.round((requests.filter((r) => r.status === "Approved").length / requests.length) * 100) : 0;
  const rejectRate = requests.length ? Math.round((requests.filter((r) => r.status === "Rejected").length / requests.length) * 100) : 0;
  const avgAmountUsd = requests.filter((r) => r.currency === "USD").length
    ? Math.round(requests.filter((r) => r.currency === "USD").reduce((a, b) => a + b.amount, 0) / requests.filter((r) => r.currency === "USD").length)
    : 0;
  const pendingCEO = requests.filter((r) => r.status === "Pending Review" && (r.approvalFlow?.[r.currentApprovalStep ?? 0]) === "Admin").length;
  const overdue48h = requests.filter((r) => (r.status === "Draft" || r.status === "Pending Review") && (Date.now() - +new Date(r.updatedAt)) > 48 * 60 * 60 * 1000).length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-cairo text-lg">التقارير</div>
            <div className="text-xs text-white/60">تصدير بيانات الطلبات وملخص الأداء</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportRequestsCsv(requests)} className="rounded-xl bg-[#0038a8] px-3 py-2 text-xs">تصدير CSV للطلبات</button>
            <button onClick={() => exportKpiReport("ACS KPI Report", [
              `Total Requests: ${requests.length}`,
              `Open Requests: ${openRequests.length}`,
              `Approval Rate: ${approvalRate}%`,
              `Reject Rate: ${rejectRate}%`,
              `Avg USD Amount: ${avgAmountUsd}`,
              `Pending CEO: ${pendingCEO}`,
              `Overdue 48h: ${overdue48h}`,
            ])} className="rounded-xl border border-white/20 px-3 py-2 text-xs">تصدير تقرير KPI</button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {Object.entries(kpis).map(([k, v]) => (
          <Card key={k}>
            <div className="text-xs text-white/65">{k}</div>
            <div className="mt-2 text-xl font-cairo md:text-2xl">{k === "إجمالي بالدولار" ? currency(v as number, "USD") : k === "إجمالي بالدينار" ? currency(v as number, "IQD") : v}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-cyan-400/40 bg-cyan-500/10">
          <div className="text-xs text-cyan-200">بانتظار CEO</div>
          <div className="mt-1 text-2xl font-cairo text-cyan-100">{pendingCEO}</div>
        </Card>
        <Card className="border-rose-400/40 bg-rose-500/10">
          <div className="text-xs text-rose-200">متأخرة أكثر من 48 ساعة</div>
          <div className="mt-1 text-2xl font-cairo text-rose-100">{overdue48h}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-72">
          <div className="mb-2 text-sm text-white/70">تحليل المبالغ</div>
          <ResponsiveContainer>
            <LineChart data={requests.map((r, i) => ({ i, amount: r.amount }))}>
              <Line dataKey="amount" stroke="#00c2a8" />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-72">
          <div className="mb-2 text-sm text-white/70">توزيع الحالات</div>
          <ResponsiveContainer>
            <BarChart data={series}>
              <XAxis dataKey="name" />
              <Bar dataKey="value" fill="#0038a8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-72">
          <div className="mb-2 text-sm text-white/70">أنواع الطلبات</div>
          <ResponsiveContainer>
            <BarChart data={byType}>
              <XAxis dataKey="name" hide />
              <Bar dataKey="value" fill="#00c2a8" />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-cairo text-xl">الطلبات المفتوحة</h2>
          <Link href="/requests" className="text-sm text-cyan-300">عرض كل الطلبات</Link>
        </div>

        {recentOpen.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-4 text-sm text-white/65">لا توجد طلبات مفتوحة حاليًا.</div>
        ) : (
          <div className="space-y-2">
            {recentOpen.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3">
                <div className="min-w-28 text-xs text-white/55">{r.requestId}</div>
                <div className="flex-1 font-cairo">{r.title}</div>
                <StatusBadge status={r.status} />
                <div className="text-xs text-white/60">{currency(r.amount, r.currency)}</div>
                <div className="text-xs text-white/50">آخر تحديث: {formatDate(r.updatedAt)}</div>
                <Link href={`/requests/${r.id}`} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15">فتح</Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
