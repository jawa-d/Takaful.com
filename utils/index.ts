export const cn = (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" ");

export const currency = (amount: number, code: "USD" | "IQD" = "USD") =>
  new Intl.NumberFormat(code === "IQD" ? "ar-IQ" : "en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export const normalizeWhatsappNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `964${digits.slice(1)}`;
  return digits;
};
