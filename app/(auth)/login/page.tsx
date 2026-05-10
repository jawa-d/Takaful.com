"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { UserRole } from "@/types";

const allowedUsers: Record<string, { password: string; role: UserRole; department: string; displayName: string }> = {
  ceo: { password: "ceo", role: "Admin", department: "الإدارة العليا", displayName: "CEO" },
  it: { password: "it", role: "Manager", department: "تقنية المعلومات", displayName: "IT" },
  fns: { password: "fns", role: "Finance", department: "المالية", displayName: "FNS" },
};

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <motion.div className="absolute h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" animate={{ x: [0, 80, 0], y: [0, -40, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
        <h1 className="font-cairo text-3xl">منصة الطلبات الداخلية</h1>
        <p className="mt-2 text-sm text-white/70">دخول بالحسابات المعتمدة فقط</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-6 w-full rounded-xl border border-white/15 bg-black/20 p-3" placeholder="اسم المستخدم" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 p-3" placeholder="كلمة المرور" />
        {error && <div className="mt-3 text-sm text-rose-300">{error}</div>}
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked onChange={(e) => localStorage.setItem("dir", e.target.checked ? "rtl" : "ltr")} /> وضع عربي (RTL)</label>
        <button
          disabled={loading}
          onClick={() => {
            const key = username.trim().toLowerCase();
            const user = allowedUsers[key];
            if (!user || user.password !== password) {
              setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
              return;
            }
            setError("");
            setLoading(true);
            login({ name: user.displayName, role: user.role, department: user.department, rtl: localStorage.getItem("dir") !== "ltr" });
            router.replace("/dashboard");
          }}
          className="mt-5 w-full rounded-xl bg-[#0038a8] p-3 disabled:opacity-60"
        >
          {loading ? "جاري الدخول..." : "دخول المنصة"}
        </button>
      </motion.div>
    </div>
  );
}

