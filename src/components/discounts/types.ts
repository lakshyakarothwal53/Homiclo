export type DiscountStatus = "Active" | "Expired" | "Upcoming" | "Ended";
export type DiscountValueType = "percentage" | "flat";

export type PromoRow = {
  id: string;
  name: string;
  code: string;
  valueType: DiscountValueType;
  value: number; // 10 means 10% (percentage) or ₹10 (flat)
  minOrder: number;
  validFrom: string; // ISO date — "2024-11-01"
  validTo: string; // ISO date
  used: number;
  cap: number | null; // usage limit, null = unlimited
  status: DiscountStatus;
};

export const BRANCHES = ["All Branches", "Bandra", "Andheri", "Powai", "Worli"] as const;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return inr.format(value);
}

export function formatValue(row: Pick<PromoRow, "valueType" | "value">): string {
  return row.valueType === "percentage" ? `${row.value}%` : formatCurrency(row.value);
}

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string, withYear = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (withYear ? longDate : shortDate).format(d);
}

export function computeStatus(validFrom: string, validTo: string): DiscountStatus {
  const now = Date.now();
  const from = new Date(validFrom).getTime();
  const to = new Date(validTo).getTime();
  if (!Number.isNaN(from) && now < from) return "Upcoming";
  if (!Number.isNaN(to) && now > to) return "Expired";
  return "Active";
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
