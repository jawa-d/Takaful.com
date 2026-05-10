"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { upsertRequestToFirestore } from "@/lib/firebase-requests";

const schema = z.object({
  employeeName: z.string().min(2),
  title: z.string().min(4),
  description: z.string().min(10),
  amount: z.number().positive(),
  currency: z.enum(["USD", "IQD"]),
  requestType: z.enum(["Financial", "Internal Approval", "Administrative", "Purchase", "HR"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
});

type FormValues = z.infer<typeof schema>;

export default function NewRequestPage() {
  const router = useRouter();
  const session = useAppStore((s) => s.session)!;
  const createRequest = useAppStore((s) => s.createRequest);
  const canCreate = session.role === "Manager" || session.role === "Finance";
  const [step, setStep] = useState(1);
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeName: session.name, requestType: "Financial", priority: "Medium", currency: "USD" } as Partial<FormValues>,
  });

  const onSubmit = (data: FormValues) => {
    const id = createRequest({ ...data, department: session.department, status: "Draft", attachments: ["mock-file.pdf"], notes: [] }, session.role);
    if (!id) {
      alert("ليس لديك صلاحية إنشاء طلب.");
      return;
    }
    const created = useAppStore.getState().requests.find((r) => r.id === id);
    if (created) void upsertRequestToFirestore(created);
    router.push(`/requests/${id}`);
  };

  if (!canCreate) {
    return <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">ليس لديك صلاحية إنشاء طلبات. مسموح فقط لمستخدمي IT و FNS.</div>;
  }

  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-6"><div className="text-sm text-white/65">الخطوة {step} من 3</div><motion.div key={step} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="grid gap-3 md:grid-cols-2"><input {...register("employeeName")} placeholder="اسم مقدم الطلب" className="rounded-xl border border-white/15 bg-black/20 p-3 md:col-span-2" /><input {...register("title")} placeholder="عنوان الطلب" className="rounded-xl border border-white/15 bg-black/20 p-3 md:col-span-2" /><textarea {...register("description")} placeholder="الوصف" className="min-h-28 rounded-xl border border-white/15 bg-black/20 p-3 md:col-span-2" /><input type="number" {...register("amount", { valueAsNumber: true })} placeholder="المبلغ" className="rounded-xl border border-white/15 bg-black/20 p-3" /><select {...register("currency")} className="rounded-xl border border-white/15 bg-black/20 p-3"><option value="USD">دولار (USD)</option><option value="IQD">دينار عراقي (IQD)</option></select><select {...register("requestType")} className="rounded-xl border border-white/15 bg-black/20 p-3"><option>Financial</option><option>Internal Approval</option><option>Administrative</option><option>Purchase</option><option>HR</option></select><select {...register("priority")} className="rounded-xl border border-white/15 bg-black/20 p-3"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><div className="rounded-xl border border-white/10 p-3 text-xs text-white/70">معاينة مباشرة: {watch("title") || "بدون عنوان"}</div></motion.div>{Object.values(errors).length > 0 && <div className="text-sm text-rose-300">يرجى إكمال الحقول المطلوبة.</div>}<div className="flex gap-2"><button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="rounded-xl border border-white/15 px-4 py-2">السابق</button><button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))} className="rounded-xl border border-white/15 px-4 py-2">التالي</button><button className="ml-auto rounded-xl bg-[#0038a8] px-5 py-2">حفظ كمسودة</button></div></form>;
}
