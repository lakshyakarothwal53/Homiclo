export type DiscountStatus = "Active" | "Expired" | "Upcoming" | "Ended";
export type DiscountValueType = "percentage" | "flat";

// What a discount applies to. 'brand' is reserved for when a brand source exists.
export type DiscountTargetType = "product" | "category" | "brand";

// A single selected target — id is the stable key (product SKU / category name),
// label is what's shown to the user.
export type DiscountTarget = { id: string; label: string };

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
  appliesToType: DiscountTargetType | null; // null = whole store
  appliesTo: DiscountTarget[];
};

const TARGET_NOUN: Record<DiscountTargetType, string> = {
  product: "products",
  category: "categories",
  brand: "brands",
};

// Compact summary of a promo's targets for the "Applies To" table cell.
export function formatTargets(row: Pick<PromoRow, "appliesToType" | "appliesTo">): string {
  if (!row.appliesToType || row.appliesTo.length === 0) return "All products";
  const labels = row.appliesTo.map((t) => t.label);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} ${TARGET_NOUN[row.appliesToType]}`;
}

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
