"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, TableProperties, Bell, ClipboardList, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { useHydrate } from "@/hooks/use-hydrate";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useHydrate();
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((s) => s.session);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const notifications = useAppStore((s) => s.notifications);
  const logout = useAppStore((s) => s.logout);
  const [cmd, setCmd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifiedCountRef = useRef(0);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (notifications.length <= notifiedCountRef.current) return;
    const newest = notifications[0];
    new Notification("إشعار جديد", { body: newest });
    notifiedCountRef.current = notifications.length;
  }, [notifications]);

  if (!hasHydrated) return <div className="p-8 text-white/70">جاري تحميل مساحة العمل...</div>;
  if (!session) return <div className="p-8">الجلسة غير موجودة. <Link href="/login">تسجيل الدخول</Link></div>;

  const canCreate = session.role === "Manager" || session.role === "Finance";
  const nav = [
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    ...(canCreate ? [{ href: "/requests/new", label: "إنشاء طلب", icon: PlusCircle }] : []),
    { href: "/requests", label: "مركز الطلبات", icon: TableProperties },
    { href: "/audit", label: "سجل التدقيق", icon: ClipboardList },
  ];

  const isDark = resolvedTheme === "dark";

  return (
    <div dir={session.rtl ? "rtl" : "ltr"} className="min-h-screen p-4 md:p-6">
      {cmd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-8" onClick={() => setCmd(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-3">
            <div className="text-xs text-white/60">لوحة الأوامر (Ctrl/Cmd+K)</div>
            {nav.map((n) => (
              <button
                key={n.href}
                onClick={() => {
                  router.push(n.href);
                  setCmd(false);
                }}
                className="mt-2 w-full rounded-lg bg-white/5 p-2 text-right hover:bg-white/10"
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur">
          <div className="mb-6">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
              <Image
                src="/iraq-takaful-logo.jpeg"
                alt="شعار شركة تكافل العراق للتأمين التكافلي"
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl object-cover"
                priority
              />
              <div>
                <div className="font-cairo text-sm">شركة تكافل العراق</div>
                <div className="text-xs text-white/65">للتأمين التكافلي</div>
              </div>
            </div>
          </div>
          <nav className="space-y-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10",
                  pathname.startsWith(item.href) && "bg-white/10 text-white"
                )}
              >
                <item.icon size={16} /> {item.label}
              </Link>
            ))}
          </nav>
          <button className="mt-6 w-full rounded-xl border border-rose-300/40 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10" onClick={() => { logout(); router.push('/login'); }}>
            تسجيل الخروج
          </button>
        </aside>

        <main>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <Image
                src="/iraq-takaful-logo.jpeg"
                alt="شعار شركة تكافل العراق للتأمين التكافلي"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
              />
              <div>
                <div className="font-cairo text-lg">مرحبًا، {session.name}</div>
                <div className="text-sm text-white/65">{session.role} · {session.department}</div>
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                type="button"
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                {isDark ? "الوضع النهاري" : "الوضع الليلي"}
              </button>

              <button onClick={() => setShowNotifications((s) => !s)} className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                <Bell size={14} /> {notifications.length} إشعارات
              </button>

              <button className="rounded-xl border border-rose-300/40 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10" onClick={() => { logout(); router.push('/login'); }}>
                تسجيل الخروج
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-10 z-20 w-80 rounded-xl border border-white/15 bg-slate-900/95 p-3">
                  <div className="mb-2 text-xs text-white/60">آخر الإشعارات</div>
                  {notifications.length === 0 ? (
                    <div className="text-xs text-white/50">لا توجد إشعارات</div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.slice(0, 8).map((item, i) => (
                        <div key={`${item}-${i}`} className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white/80">
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {children}
        </main>
      </div>
    </div>
  );
}
