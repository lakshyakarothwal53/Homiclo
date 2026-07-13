import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * "YYYY-MM-DD" in the browser's local timezone. Unlike `Date#toISOString()`
 * (always UTC), this matches the calendar day a user in a timezone ahead of
 * UTC (e.g. India, UTC+5:30) actually sees — `toISOString().slice(0, 10)`
 * reads a day behind for roughly the first 5.5 hours of the local day.
 */
export function localDateIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
