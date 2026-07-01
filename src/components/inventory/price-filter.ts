export type PriceSort = "none" | "low" | "high";
export type PriceRange =
  | "all"
  | "0-2000"
  | "2000-4000"
  | "4000-6000"
  | "6000-8000"
  | "8000-10000"
  | "10000+";

/** Six ₹2k buckets plus "All prices"; shared by the FilterBar price control + pages. */
export const PRICE_RANGES: { value: PriceRange; label: string }[] = [
  { value: "all", label: "All prices" },
  { value: "0-2000", label: "₹0 – ₹2k" },
  { value: "2000-4000", label: "₹2k – ₹4k" },
  { value: "4000-6000", label: "₹4k – ₹6k" },
  { value: "6000-8000", label: "₹6k – ₹8k" },
  { value: "8000-10000", label: "₹8k – ₹10k" },
  { value: "10000+", label: "₹10k+" },
];

/** True if `price` falls in the given bucket. Upper bound exclusive, "10000+" open-ended. */
export function priceInRange(price: number, range: PriceRange): boolean {
  if (range === "all") return true;
  if (range === "10000+") return price >= 10000;
  const [lo, hi] = range.split("-").map(Number);
  return price >= lo && price < hi;
}
