export type AmountSort = "none" | "low" | "high";
export type AmountRange =
  | "all"
  | "0-1000"
  | "1000-5000"
  | "5000-10000"
  | "10000-25000"
  | "25000-50000"
  | "50000+";

/** Invoice-scale buckets (wider than the inventory ₹2k product buckets). */
export const AMOUNT_RANGES: { value: AmountRange; label: string }[] = [
  { value: "all", label: "All amounts" },
  { value: "0-1000", label: "< ₹1k" },
  { value: "1000-5000", label: "₹1k – ₹5k" },
  { value: "5000-10000", label: "₹5k – ₹10k" },
  { value: "10000-25000", label: "₹10k – ₹25k" },
  { value: "25000-50000", label: "₹25k – ₹50k" },
  { value: "50000+", label: "₹50k+" },
];

/** Parse a display amount like "₹4,616" (or a number) to a plain number. */
export function parseAmount(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** True if `amount` falls in the bucket. Upper bound exclusive, "50000+" open-ended. */
export function amountInRange(amount: number, range: AmountRange): boolean {
  if (range === "all") return true;
  if (range === "50000+") return amount >= 50000;
  const [lo, hi] = range.split("-").map(Number);
  return amount >= lo && amount < hi;
}
