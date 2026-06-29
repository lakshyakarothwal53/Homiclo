// Report rows now come from Supabase via `useReports(category)` in
// src/hooks/use-reports.ts. The filter/config constants below stay here — they
// are UI options, not database data.

export type { ReportRow } from "@/types/reports";

export const BRANCHES = [
  "All Branches",
  "Mumbai – Andheri",
  "Delhi – Connaught Place",
  "Bengaluru – Koramangala",
  "Pune – Baner",
] as const;

export const DEPARTMENTS = ["All", "Sales", "Operations", "Finance", "HR", "Warehouse"] as const;

export const REPORT_TYPES = [
  "Sales",
  "Attendance",
  "Employee",
  "Inventory",
  "Discount Performance",
  "Financial",
] as const;

export const EXPORT_FORMATS = ["Excel (.xlsx)", "CSV (.csv)", "PDF (.pdf)"] as const;
