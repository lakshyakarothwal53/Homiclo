// Mock report data — replace with Supabase queries (e.g. `use-reports`) later.

export type ReportRow = {
  id: string;
  name: string;
  type: string;
  period: string;
  generated: string;
  size: string;
};

export const BRANCHES = [
  "All Branches",
  "Mumbai – Andheri",
  "Delhi – Connaught Place",
  "Bengaluru – Koramangala",
  "Pune – Baner",
] as const;

export const DEPARTMENTS = ["All", "Sales", "Operations", "Finance", "HR", "Warehouse"] as const;

export const SALES_REPORTS: ReportRow[] = [
  { id: "s1", name: "Daily Sales Summary", type: "Daily", period: "12 Nov 2024", generated: "12 Nov", size: "124 KB" },
  { id: "s2", name: "Monthly Sales Report", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "2.4 MB" },
  { id: "s3", name: "Product-wise Sales", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "1.1 MB" },
  { id: "s4", name: "Branch Performance", type: "Quarterly", period: "Q3 2024", generated: "01 Oct", size: "3.2 MB" },
];

export const ATTENDANCE_REPORTS: ReportRow[] = [
  { id: "a1", name: "Monthly Attendance", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "890 KB" },
  { id: "a2", name: "Late Arrival Summary", type: "Weekly", period: "Week 46", generated: "11 Nov", size: "124 KB" },
  { id: "a3", name: "Absenteeism Report", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "210 KB" },
];

export const EMPLOYEE_REPORTS: ReportRow[] = [
  { id: "e1", name: "Employee Master List", type: "All", period: "12 Nov 2024", generated: "12 Nov", size: "420 KB" },
  { id: "e2", name: "Performance Review", type: "Quarterly", period: "Q3 2024", generated: "01 Oct", size: "1.4 MB" },
  { id: "e3", name: "Login Activity", type: "Weekly", period: "Week 46", generated: "11 Nov", size: "320 KB" },
];

export const INVENTORY_REPORTS: ReportRow[] = [
  { id: "i1", name: "Stock Valuation", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "680 KB" },
  { id: "i2", name: "Fast Moving Items", type: "Quarterly", period: "Q3 2024", generated: "01 Oct", size: "420 KB" },
  { id: "i3", name: "Stock Ageing", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "510 KB" },
];

export const DISCOUNT_REPORTS: ReportRow[] = [
  { id: "d1", name: "Campaign ROI", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "224 KB" },
  { id: "d2", name: "Discount Usage", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "180 KB" },
];

export const FINANCIAL_REPORTS: ReportRow[] = [
  { id: "f1", name: "Profit & Loss", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "890 KB" },
  { id: "f2", name: "Cash Flow", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "620 KB" },
  { id: "f3", name: "Tax Summary (GST)", type: "Monthly", period: "Nov 2024", generated: "12 Nov", size: "410 KB" },
];

export const REPORT_TYPES = [
  "Sales",
  "Attendance",
  "Employee",
  "Inventory",
  "Discount Performance",
  "Financial",
] as const;

export const EXPORT_FORMATS = ["Excel (.xlsx)", "CSV (.csv)", "PDF (.pdf)"] as const;
