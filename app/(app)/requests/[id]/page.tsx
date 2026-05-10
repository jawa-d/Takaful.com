"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { StatusBadge } from "@/components/ui/status-badge";
import { currency, formatDate, normalizeWhatsappNumber } from "@/utils";
import { exportDocx, exportPdf } from "@/lib/export";
import { CurrencyCode, UserRole } from "@/types";
import { deleteRequestFromFirestore, upsertRequestToFirestore } from "@/lib/firebase-requests";

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const request = useAppStore((s) => s.requests.find((r) => r.id === id));
  const session = useAppStore((s) => s.session)!;
  const updateStatus = useAppStore((s) => s.updateStatus);
  const updateRequest = useAppStore((s) => s.updateRequest);
  const deleteRequest = useAppStore((s) => s.deleteRequest);
  const archiveRequest = useAppStore((s) => s.archiveRequest);
  const restoreRequest = useAppStore((s) => s.restoreRequest);
  const canApproveReject = session.role === "Admin";
  const canFullEdit = session.role === "Manager";

  const [title, setTitle] = useState(request?.title ?? "");
  const [description, setDescription] = useState(request?.description ?? "");
  const [amount, setAmount] = useState<number>(request?.amount ?? 0);
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(request?.currency ?? "USD");
  const [whatsappNumber, setWhatsappNumber] = useState("9647");

  const locked = useMemo(() => request?.status === "Approved" || request?.status === "Rejected", [request?.status]);

  if (!request) return <div>الطلب غير موجود</div>;
  const currentApprover = request.approvalFlow?.[request.currentApprovalStep ?? 0];
  const approverLabel: Record<UserRole, string> = { Employee: "الموظف", Finance: "FNS", Manager: "IT", Admin: "CEO" };
  const canActOnApprovalStep = request.status === "Pending Review" && currentApprover === session.role;

  const onSave = async () => {
    const ok = updateRequest(request.id, { title, description, amount, currency: currencyCode }, session.name, session.role);
    if (!ok) {
      alert("لا توجد صلاحية للتعديل أو الطلب مقفول.");
      return;
    }
    const updated = useAppStore.getState().requests.find((r) => r.id === request.id);
    if (updated) {
      try {
        await upsertRequestToFirestore(updated);
      } catch (error) {
        console.error(error);
        alert("فشل حفظ التعديلات في Firebase.");
        return;
      }
    }
    alert("تم حفظ التعديلات.");
  };

  const onDelete = async () => {
    const ok = deleteRequest(request.id, session.role);
    if (!ok) {
      alert("لا توجد صلاحية للحذف أو الطلب مقفول.");
      return;
    }
    try {
      await deleteRequestFromFirestore(request.id);
    } catch (error) {
      console.error(error);
      alert("فشل حذف الطلب من Firebase.");
      return;
    }
    router.push("/requests");
  };

  const changeStatus = async (nextStatus: "Pending Review" | "Approved" | "Rejected" | "Draft") => {
    if (session.role === "Admin" && nextStatus !== "Approved" && nextStatus !== "Rejected") {
      alert("صلاحيتك تقتصر على الموافقة أو الرفض فقط.");
      return;
    }
    const ok = updateStatus(request.id, nextStatus, session.name, session.role);
    if (!ok) alert("الطلب المقفول (موافق عليه أو مرفوض) لا يمكن تغييره.");
    if (ok) {
      const updated = useAppStore.getState().requests.find((r) => r.id === request.id);
      if (updated) {
        try {
          await upsertRequestToFirestore(updated);
        } catch (error) {
          console.error(error);
          alert("تم تحديث الحالة محليًا لكن فشل الحفظ في Firebase.");
        }
      }
    }
  };

  const onArchive = async () => {
    const ok = archiveRequest(request.id, session.name, session.role);
    if (!ok) alert("لا يمكن أرشفة الطلب. الصلاحية مطلوبة لمستخدم IT فقط.");
    if (ok) {
      const updated = useAppStore.getState().requests.find((r) => r.id === request.id);
      if (updated) {
        try {
          await upsertRequestToFirestore(updated);
        } catch (error) {
          console.error(error);
          alert("تمت الأرشفة محليًا لكن فشل الحفظ في Firebase.");
        }
      }
    }
  };

  const onRestore = async () => {
    const ok = restoreRequest(request.id, session.name, session.role);
    if (!ok) alert("لا يمكن استرجاع الطلب. الصلاحية مطلوبة لمستخدم IT فقط.");
    if (ok) {
      const updated = useAppStore.getState().requests.find((r) => r.id === request.id);
      if (updated) {
        try {
          await upsertRequestToFirestore(updated);
        } catch (error) {
          console.error(error);
          alert("تم الاسترجاع محليًا لكن فشل الحفظ في Firebase.");
        }
      }
    }
  };

  const onShareWhatsapp = () => {
    const to = normalizeWhatsappNumber(whatsappNumber);
    if (!to) {
      alert("اكتب رقم واتساب صحيح.");
      return;
    }

    const text = [
      "تم إنشاء طلب صرف جديد",
      `رقم الطلب: ${request.requestId}`,
      `العنوان: ${title || request.title}`,
      `المبلغ: ${currency(amount, currencyCode)}`,
      `الجهة: ${request.department}`,
      `مقدم الطلب: ${request.employeeName}`,
      `الحالة: ${request.status}`,
    ].join("\n");

    const url = `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const exportRequest = {
    ...request,
    title,
    description,
    amount,
    currency: currencyCode,
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-slate-900/80 to-slate-950/70 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,194,168,0.15),transparent_40%)]" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wider text-cyan-300">{request.requestId}</div>
              <h1 className="mt-1 font-cairo text-3xl leading-tight">{request.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
                <StatusBadge status={request.status} />
                <span>آخر تحديث: {formatDate(request.updatedAt)}</span>
                <span>المبلغ: {currency(amount, currencyCode)}</span>
              </div>
            </div>
          </div>

          <p className="rounded-2xl border border-white/10 bg-black/20 p-4 leading-8 text-white/90">{request.description}</p>

          {locked && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              هذا الطلب مقفول (موافق عليه أو مرفوض)، لذلك لا يمكن حذفه أو تعديله أو تغيير حالته.
            </div>
          )}
          {request.approvalSignature && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              <div>توقيع الاعتماد: {request.approvalSignature.signatureText}</div>
              <div className="text-xs text-emerald-200/80">اعتمد بواسطة: {request.approvalSignature.approvedBy} · {request.approvalSignature.approvedRole} · {formatDate(request.approvalSignature.approvedAt)}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {canFullEdit && request.status === "Draft" && <button disabled={locked} onClick={() => changeStatus("Pending Review")} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40">إرسال للموافقة</button>}
            {canApproveReject && <button disabled={locked || !canActOnApprovalStep} onClick={() => changeStatus("Approved")} className="rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-40">موافقة</button>}
            {canApproveReject && <button disabled={locked || !canActOnApprovalStep} onClick={() => changeStatus("Rejected")} className="rounded-xl border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/30 disabled:opacity-40">رفض</button>}
            <button onClick={() => exportPdf(exportRequest)} className="rounded-xl bg-[#0038a8] px-4 py-2 text-sm hover:brightness-110">تصدير PDF</button>
            <button onClick={() => exportDocx(exportRequest)} className="rounded-xl bg-[#00c2a8] px-4 py-2 text-sm text-black hover:brightness-110">تصدير DOCX</button>
            <button onClick={() => window.print()} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">طباعة</button>
            {canFullEdit && request.status !== "Archived" && <button onClick={onArchive} className="rounded-xl border border-indigo-400/50 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-500/10">أرشفة</button>}
            {canFullEdit && request.status === "Archived" && <button onClick={onRestore} className="rounded-xl border border-cyan-400/50 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10">استرجاع من الأرشيف</button>}
            <input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="9647XXXXXXXXX"
              className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm"
            />
            <button onClick={onShareWhatsapp} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500">إرسال واتساب</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <h2 className="font-cairo text-lg">تعديل الطلب</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked || !canFullEdit} className="rounded-xl border border-white/15 bg-black/20 p-3 disabled:opacity-50 md:col-span-2" placeholder="عنوان الطلب" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={locked || !canFullEdit} className="min-h-24 rounded-xl border border-white/15 bg-black/20 p-3 disabled:opacity-50 md:col-span-2" placeholder="الوصف" />
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} disabled={locked || !canFullEdit} className="rounded-xl border border-white/15 bg-black/20 p-3 disabled:opacity-50" placeholder="المبلغ" />
          <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value as CurrencyCode)} disabled={locked || !canFullEdit} className="rounded-xl border border-white/15 bg-black/20 p-3 disabled:opacity-50"><option value="USD">دولار (USD)</option><option value="IQD">دينار عراقي (IQD)</option></select>
          <div className="flex items-center gap-2 md:col-span-2">
            <button disabled={locked || !canFullEdit} onClick={onSave} className="rounded-xl bg-[#0038a8] px-4 py-2 disabled:opacity-40">حفظ التعديلات</button>
            <button disabled={locked || !canFullEdit} onClick={onDelete} className="rounded-xl border border-rose-400/50 px-4 py-2 text-rose-300 disabled:opacity-40">حذف الطلب</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <h2 className="font-cairo text-lg">الخط الزمني</h2>
        <div className="mt-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {request.status === "Pending Review" ? "بانتظار موافقة: CEO" : `المسار: ${(request.approvalFlow ?? []).map((r) => approverLabel[r]).join(" -> ")}`}
        </div>
        <div className="mt-3 space-y-3">
          {request.workflow.map((w, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-sm">{w.action}</div>
              <div className="text-xs text-white/60">{w.by} · {w.role} · {formatDate(w.at)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
