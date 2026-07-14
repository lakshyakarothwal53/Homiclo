export type ReportCategory =
  | "sales"
  | "attendance"
  | "employee"
  | "inventory"
  | "discount"
  | "financial";

export interface ReportRow {
  id: string;
  name: string;
  type: string;
  period: string;
  generated: string;
  size: string;
}
