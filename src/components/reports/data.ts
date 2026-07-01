// Report rows now come from Supabase via `useReports(category, branch)` in
// src/hooks/use-reports.ts. Branch options come from `useReportBranches()` (see
// supabase/reports/04_branches.sql) — Reports has its own city-outlet vocabulary,
// distinct from the shared `branches` table used by inventory/billing/discounts.
// The filter/config constants below stay here — they are UI options, not database data.

export type { ReportRow } from "@/types/reports";

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
