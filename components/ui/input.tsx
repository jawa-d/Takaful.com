import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-400", className)} {...props} />;
}

