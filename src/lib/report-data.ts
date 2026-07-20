import { supabase } from "@/lib/supabase";
import { fetchLowStockAlerts } from "@/lib/inventory-utils";
import type { ReportCategory } from "@/types/reports";

export type ReportData = {
  columns: string[];
  rows: (string | number)[][];
};

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse the date shapes stored across tables: ISO ("2026-07-06"),
 * "6 Jul 2026", or day-month only ("12 Nov" — assumed current year).
 */
export function parseRowDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10) + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s*(\d{4})?$/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    return new Date(year, month, parseInt(m[1], 10));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * True when the row's date (first parseable candidate) falls on the selected
 * ISO date. Empty filter matches everything; a row with no parseable date
 * only matches an empty filter.
 */
export function matchesDate(filterIso: string, ...candidates: unknown[]): boolean {
  if (!filterIso) return true;
  for (const c of candidates) {
    const d = parseRowDate(c);
    if (d) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return iso === filterIso;
    }
  }
  return false;
}

/** Today's date as a local ISO string (YYYY-MM-DD), matching the timezone the
 * user sees — unlike `new Date().toISOString()` which is UTC and can roll to
 * the previous/next day for IST users. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function inRange(d: Date | null, from?: string, to?: string): boolean {
  if (!d) return !from && !to;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export const LATE_CUTOFF_MINUTES = 9 * 60 + 15; // 09:15 AM shift start + grace
export const SHIFT_START_MINUTES = 9 * 60; // 09:00 AM shift start — lateness measured from here

// "09:31 AM" → minutes since midnight, or null when unparseable.
export function parseTimeToMinutes(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  sales: "Sales Report",
  attendance: "Attendance Report",
  employee: "Employee Report",
  inventory: "Inventory Report",
  discount: "Discount Performance Report",
  financial: "Financial Report",
};

/**
 * Fetch the live rows behind a report category straight from Supabase, so
 * exports/downloads always contain actual data (never the metadata row alone).
 */
export async function fetchReportData(
  category: ReportCategory,
  opts: { from?: string; to?: string; branch?: string } = {},
): Promise<ReportData> {
  const { from, to } = opts;
  const branch = opts.branch && opts.branch !== "all" && opts.branch !== "All" ? opts.branch : "";

  switch (category) {
    case "sales": {
      // billing_sales_bills_branches has no bill_date column — select it
      // only for the global table; the branch path falls back to `date`.
      const q = branch
        ? supabase
            .from("billing_sales_bills_branches")
            .select("invoice, date, customer, amount, payment, status")
            .eq("branch", branch)
            .order("invoice", { ascending: false })
        : supabase
            .from("billing_sales_bills")
            .select("invoice, date, customer, amount, payment, status, bill_date")
            .order("invoice", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []).filter((r) =>
        inRange(parseRowDate((r as { bill_date?: string }).bill_date ?? r.date), from, to),
      );
      return {
        columns: ["Invoice", "Date", "Customer", "Amount", "Payment", "Status"],
        rows: rows.map((r) => [r.invoice, r.date, r.customer, r.amount, r.payment, r.status]),
      };
    }
    case "attendance": {
      // Built from the real employees roster + their own employee_checkins/
      // absent_records rows — daily_logs is a demo table with zero real
      // employees in it (every row is a seeded EMP0xx code).
      let empQuery = supabase.from("employees").select("id, name, branch");
      if (branch) empQuery = empQuery.eq("branch", branch);
      const { data: employees, error: empError } = await empQuery;
      if (empError) throw empError;
      const employeeIds = (employees ?? []).map((e) => e.id);
      if (employeeIds.length === 0) {
        return {
          columns: ["Date", "Employee ID", "Name", "Check-in", "Check-out", "Status", "Branch"],
          rows: [],
        };
      }
      const nameById = new Map((employees ?? []).map((e) => [e.id, e.name]));
      const branchById = new Map((employees ?? []).map((e) => [e.id, e.branch]));

      const { data: checkins, error: chkError } = await supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_type, check_time, status")
        .in("employee_id", employeeIds);
      if (chkError) throw chkError;

      type Row = { checkIn: number | null; checkInTime: string; checkOut: string };
      const byKey = new Map<string, Row>();
      (checkins ?? [])
        .filter((c) => !c.status || c.status === "success")
        .forEach((c) => {
          const key = `${c.employee_id}|${c.check_date}`;
          const cur = byKey.get(key) ?? { checkIn: null, checkInTime: "", checkOut: "" };
          const mins = parseTimeToMinutes(c.check_time);
          if (c.check_type === "check-in") {
            if (mins !== null && (cur.checkIn === null || mins < cur.checkIn)) {
              cur.checkIn = mins;
              cur.checkInTime = c.check_time;
            }
          } else {
            cur.checkOut = c.check_time;
          }
          byKey.set(key, cur);
        });

      const { data: absences, error: absError } = await supabase
        .from("absent_records")
        .select("employee_id, date, status")
        .in("employee_id", employeeIds);
      if (absError) throw absError;

      const rows: (string | number)[][] = [];
      byKey.forEach((r, key) => {
        const [employeeId, date] = key.split("|");
        if (!inRange(parseRowDate(date), from, to)) return;
        const status = r.checkIn !== null && r.checkIn > LATE_CUTOFF_MINUTES ? "Late" : "Present";
        rows.push([
          date,
          employeeId,
          nameById.get(employeeId) ?? "",
          r.checkInTime || "-",
          r.checkOut || "-",
          status,
          branchById.get(employeeId) ?? "",
        ]);
      });
      (absences ?? [])
        .filter((a) => a.status === "Absent" && inRange(parseRowDate(a.date), from, to))
        .forEach((a) => {
          rows.push([
            a.date,
            a.employee_id,
            nameById.get(a.employee_id) ?? "",
            "-",
            "-",
            "Absent",
            branchById.get(a.employee_id) ?? "",
          ]);
        });

      return {
        columns: ["Date", "Employee ID", "Name", "Check-in", "Check-out", "Status", "Branch"],
        rows,
      };
    }
    case "employee": {
      let q = supabase
        .from("employees")
        .select("name, email, phone, role, branch, join_date, status");
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []).filter((r) => inRange(parseRowDate(r.join_date), from, to));
      return {
        columns: ["Name", "Email", "Phone", "Role", "Branch", "Join Date", "Status"],
        rows: rows.map((r) => [
          r.name,
          r.email,
          r.phone ?? "-",
          r.role,
          r.branch,
          r.join_date ?? "-",
          r.status ?? "-",
        ]),
      };
    }
    case "inventory": {
      const { data, error } = await supabase
        .from("products")
        .select("sku, name, category, price, stock, min_stock, status")
        .order("sku");
      if (error) throw error;
      return {
        columns: ["SKU", "Product", "Category", "Price (₹)", "Stock", "Min Stock", "Status"],
        rows: (data ?? []).map((r) => [
          r.sku,
          r.name,
          r.category,
          r.price,
          r.stock,
          r.min_stock ?? "-",
          r.status,
        ]),
      };
    }
    case "discount": {
      const { data, error } = await supabase
        .from("discount_usage")
        .select("code, discount, times_used, discount_given, avg_order, conversion");
      if (error) throw error;
      return {
        columns: [
          "Code",
          "Discount",
          "Times Used",
          "Discount Given (₹)",
          "Avg Order (₹)",
          "Conversion (%)",
        ],
        rows: (data ?? []).map((r) => [
          r.code,
          r.discount,
          r.times_used,
          r.discount_given,
          r.avg_order,
          r.conversion,
        ]),
      };
    }
    case "financial": {
      const { data, error } = await supabase
        .from("billing_payments")
        .select("receipt, date, customer, invoice, amount, mode, status, pay_date");
      if (error) throw error;
      const payments = (data ?? []).filter((r) =>
        inRange(parseRowDate(r.pay_date ?? r.date), from, to),
      );
      const { data: refunds } = await supabase
        .from("billing_refunds")
        .select("refund, invoice, customer, amount, reason, status");
      return {
        columns: [
          "Type",
          "Reference",
          "Date",
          "Customer",
          "Invoice",
          "Amount",
          "Mode / Reason",
          "Status",
        ],
        rows: [
          ...payments.map((r) => [
            "Payment",
            r.receipt,
            r.date,
            r.customer,
            r.invoice,
            r.amount,
            r.mode,
            r.status,
          ]),
          ...(!from && !to
            ? (refunds ?? []).map((r) => [
                "Refund",
                r.refund,
                "-",
                r.customer,
                r.invoice,
                r.amount,
                r.reason,
                r.status,
              ])
            : []),
        ],
      };
    }
  }
}

export type ReportOpts = { from?: string; to?: string; branch?: string };

function inrCurrency(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ─── Inventory: named reports (each backed by its own live calculation, not
// the generic product list every inventory report used to share) ───────────

/** Ranks products by units actually sold (stock_outward, type='Sale'), descending. */
export async function fetchFastMovingItems(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: outward, error } = await supabase
    .from("stock_outward")
    .select("product, qty, date, type")
    .eq("type", "Sale");
  if (error) throw error;
  const { data: products } = await supabase.from("products").select("name, category, price");

  const byProduct = new Map<string, { qty: number; sales: number }>();
  (outward ?? [])
    .filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to))
    .forEach((r) => {
      const cur = byProduct.get(r.product) ?? { qty: 0, sales: 0 };
      cur.qty += r.qty ?? 0;
      cur.sales += 1;
      byProduct.set(r.product, cur);
    });

  const catByName = new Map((products ?? []).map((p) => [p.name, p.category]));
  const priceByName = new Map((products ?? []).map((p) => [p.name, p.price ?? 0]));

  const rows = [...byProduct.entries()]
    .sort(([, a], [, b]) => b.qty - a.qty)
    .map(([name, agg]) => [
      name,
      catByName.get(name) ?? "Uncategorized",
      agg.qty,
      agg.sales,
      inrCurrency((priceByName.get(name) ?? 0) * agg.qty),
    ]);

  return {
    columns: ["Product", "Category", "Units Sold", "Sale Events", "Revenue"],
    rows,
  };
}

/** Every product ranked by units sold ascending — zero-movement products surface first. */
export async function fetchSlowMovingItems(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: outward, error } = await supabase
    .from("stock_outward")
    .select("product, qty, date, type")
    .eq("type", "Sale");
  if (error) throw error;
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("name, category, stock");
  if (prodError) throw prodError;

  const soldByProduct = new Map<string, number>();
  (outward ?? [])
    .filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to))
    .forEach((r) => {
      soldByProduct.set(r.product, (soldByProduct.get(r.product) ?? 0) + (r.qty ?? 0));
    });

  const rows = (products ?? [])
    .map((p) => {
      const sold = soldByProduct.get(p.name) ?? 0;
      return [
        p.name,
        p.category,
        p.stock,
        sold,
        sold === 0 ? "No sales recorded" : sold <= 3 ? "Low movement" : "Moving",
      ] as (string | number)[];
    })
    .sort((a, b) => (a[3] as number) - (b[3] as number));

  return {
    columns: ["Product", "Category", "Current Stock", "Units Sold", "Status"],
    rows,
  };
}

/** Days since each product's most recent stock_inward (restock) entry. */
export async function fetchStockAgeing(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: inward, error } = await supabase.from("stock_inward").select("product, date, qty");
  if (error) throw error;
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("name, category, stock");
  if (prodError) throw prodError;

  const lastRestockByProduct = new Map<string, Date>();
  (inward ?? [])
    .filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to))
    .forEach((r) => {
      const d = parseRowDate(r.date);
      if (!d) return;
      const cur = lastRestockByProduct.get(r.product);
      if (!cur || d.getTime() > cur.getTime()) lastRestockByProduct.set(r.product, d);
    });

  const today = new Date();
  const rows = (products ?? [])
    .map((p) => {
      const last = lastRestockByProduct.get(p.name);
      const days = last
        ? Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const status =
        days === null
          ? "No restock on record"
          : days <= 30
            ? "Fresh"
            : days <= 90
              ? "Ageing"
              : "Stale";
      return [
        p.name,
        p.category,
        p.stock,
        last
          ? last.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : "-",
        days === null ? "-" : days,
        status,
      ] as (string | number)[];
    })
    .sort(
      (a, b) => (typeof b[4] === "number" ? b[4] : -1) - (typeof a[4] === "number" ? a[4] : -1),
    );

  return {
    columns: [
      "Product",
      "Category",
      "Current Stock",
      "Last Restocked",
      "Days Since Restock",
      "Status",
    ],
    rows,
  };
}

/** Live low-stock alerts — the same rows the Inventory > Low Stock Alerts page shows. */
export async function fetchLowStockSummary(): Promise<ReportData> {
  const data = await fetchLowStockAlerts();
  return {
    columns: ["SKU", "Product", "Current Stock", "Min Level", "Status"],
    rows: data.map((r) => [r.sku, r.product, r.currentStock, r.minLevel, r.status]),
  };
}

/** Units sold and revenue per category, from real Sale-type stock_outward records. */
export async function fetchCategoryPerformance(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: outward, error } = await supabase
    .from("stock_outward")
    .select("product, qty, date, type")
    .eq("type", "Sale");
  if (error) throw error;
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("name, category, price");
  if (prodError) throw prodError;

  const catByName = new Map((products ?? []).map((p) => [p.name, p.category]));
  const priceByName = new Map((products ?? []).map((p) => [p.name, p.price ?? 0]));
  const productCountByCategory = new Map<string, number>();
  (products ?? []).forEach((p) => {
    const cat = p.category || "Uncategorized";
    productCountByCategory.set(cat, (productCountByCategory.get(cat) ?? 0) + 1);
  });

  const byCategory = new Map<string, { units: number; revenue: number }>();
  (outward ?? [])
    .filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to))
    .forEach((r) => {
      const cat = catByName.get(r.product) ?? "Uncategorized";
      const price = priceByName.get(r.product) ?? 0;
      const cur = byCategory.get(cat) ?? { units: 0, revenue: 0 };
      cur.units += r.qty ?? 0;
      cur.revenue += price * (r.qty ?? 0);
      byCategory.set(cat, cur);
    });

  const rows = [...byCategory.entries()]
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([cat, agg]) => [
      cat,
      productCountByCategory.get(cat) ?? 0,
      agg.units,
      inrCurrency(agg.revenue),
      agg.units > 0 ? inrCurrency(agg.revenue / agg.units) : inrCurrency(0),
    ]);

  return {
    columns: ["Category", "Products", "Units Sold", "Revenue", "Avg Revenue / Unit"],
    rows,
  };
}

/** Dispatches an Inventory Reports row name to its real calculator, falling
 * back to the generic full-stock-valuation dataset for any custom report
 * names that don't match a known pattern. */
export async function fetchNamedInventoryReport(
  reportName: string,
  opts: ReportOpts = {},
): Promise<ReportData> {
  const name = reportName.toLowerCase();
  if (/fast.?moving/.test(name)) return fetchFastMovingItems(opts);
  if (/slow.?moving/.test(name)) return fetchSlowMovingItems(opts);
  if (/ageing|aging/.test(name)) return fetchStockAgeing(opts);
  if (/low.?stock/.test(name)) return fetchLowStockSummary();
  if (/category.?performance/.test(name)) return fetchCategoryPerformance(opts);
  return fetchReportData("inventory", opts);
}

// ─── Billing: named reports ──────────────────────────────────────────────

/** Real invoices billed on a single day (defaults to today when no range given). */
export async function fetchDailySalesSummary(opts: ReportOpts = {}): Promise<ReportData> {
  const result = opts.branch
    ? await supabase
        .from("billing_sales_bills_branches")
        .select("invoice, date, customer, amount, payment, status")
        .eq("branch", opts.branch)
    : await supabase
        .from("billing_sales_bills")
        .select("invoice, date, customer, amount, payment, status, bill_date")
        .order("bill_date", { ascending: false });
  if (result.error) throw result.error;
  const rowsRaw = result.data;

  const from = opts.from ?? opts.to ?? new Date().toISOString().slice(0, 10);
  const to = opts.to ?? opts.from ?? from;
  const rows = (rowsRaw ?? []).filter((r) =>
    inRange(parseRowDate((r as { bill_date?: string }).bill_date ?? r.date), from, to),
  );
  const total = rows.reduce(
    (s, r) => s + (parseFloat(String(r.amount).replace(/[₹,\s]/g, "")) || 0),
    0,
  );

  return {
    columns: ["Invoice", "Date", "Customer", "Amount", "Payment", "Status"],
    rows: [
      ...rows.map((r) => [r.invoice, r.date, r.customer, r.amount, r.payment, r.status]),
      ["", "", "", "", "Total", inrCurrency(total)],
    ],
  };
}

/** Tax invoices with each row's GSTIN — the actual GST number, not omitted. */
export async function fetchTaxSummary(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("billing_tax_invoices")
    .select("invoice, date, gstin, taxable, cgst, sgst, total")
    .order("invoice", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to));
  return {
    columns: ["Invoice", "Date", "GSTIN", "Taxable Amount", "CGST", "SGST", "Total"],
    rows: rows.map((r) => [r.invoice, r.date, r.gstin, r.taxable, r.cgst, r.sgst, r.total]),
  };
}

/** Sales bills still awaiting payment, with the real outstanding amount per invoice. */
export async function fetchOutstandingPayments(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("billing_sales_bills")
    .select("invoice, date, customer, amount, payment, status, bill_date")
    .eq("status", "Pending");
  if (error) throw error;
  const rows = (data ?? []).filter((r) =>
    inRange(parseRowDate(r.bill_date ?? r.date), opts.from, opts.to),
  );
  const total = rows.reduce(
    (s, r) => s + (parseFloat(String(r.amount).replace(/[₹,\s]/g, "")) || 0),
    0,
  );
  return {
    columns: ["Invoice", "Date", "Customer", "Outstanding Amount", "Payment Mode", "Status"],
    rows: [
      ...rows.map((r) => [r.invoice, r.date, r.customer, r.amount, r.payment, r.status]),
      ["", "", "", inrCurrency(total), "Total Outstanding", ""],
    ],
  };
}

/** Actual refund transactions, real amounts, scoped to the selected period. */
export async function fetchRefundSummary(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("billing_refunds")
    .select("*")
    .order("refund", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).filter((r) => {
    const d = parseRowDate((r as { refund_date?: string }).refund_date);
    return d ? inRange(d, opts.from, opts.to) : !opts.from && !opts.to;
  });
  const total = rows.reduce(
    (s, r) => s + (parseFloat(String(r.amount).replace(/[₹,\s]/g, "")) || 0),
    0,
  );
  return {
    columns: ["Refund", "Invoice", "Customer", "Amount", "Reason", "Status"],
    rows: [
      ...rows.map((r) => [r.refund, r.invoice, r.customer, r.amount, r.reason, r.status]),
      ["", "", "", inrCurrency(total), "Total Refunded", ""],
    ],
  };
}

/** Dispatches a Billing Reports row name to its real calculator, falling
 * back to the existing sales/financial category split for custom names. */
export async function fetchNamedBillingReport(
  reportName: string,
  opts: ReportOpts = {},
): Promise<ReportData> {
  const name = reportName.toLowerCase();
  if (/daily.?sales/.test(name)) return fetchDailySalesSummary(opts);
  if (/tax.?summary|gst/.test(name)) return fetchTaxSummary(opts);
  if (/outstanding/.test(name)) return fetchOutstandingPayments(opts);
  if (/refund/.test(name)) return fetchRefundSummary(opts);
  return fetchReportData(/sales|revenue/i.test(reportName) ? "sales" : "financial", opts);
}

// ─── Employees: Monthly Payroll + per-employee attendance summary ─────────

// Standard 6-day-week divisor used to derive a per-day rate from a monthly
// base salary (common convention in Indian retail/SMB payroll).
const WORKING_DAYS_PER_MONTH = 26;

/**
 * Salary per employee = (annual salary ÷ 12) prorated by days actually
 * present in the period, from real self-service check-ins
 * (employee_checkins.employee_id, keyed to employees.id). Employees with no
 * check-in history yet show 0 — an honest reflection of "not tracked", not a
 * bug; the figure becomes real the moment they use employee check-in.
 */
export async function fetchMonthlyPayroll(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, name, role, branch, salary");
  if (error) throw error;

  const now = new Date();
  const monthStart =
    opts.from ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd =
    opts.to ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: checkins, error: chkError } = await supabase
    .from("employee_checkins")
    .select("employee_id, check_date")
    .eq("check_type", "check-in")
    .gte("check_date", monthStart)
    .lte("check_date", monthEnd);
  if (chkError) throw chkError;

  const presentDaysByEmployee = new Map<string, Set<string>>();
  (checkins ?? []).forEach((c) => {
    if (!presentDaysByEmployee.has(c.employee_id))
      presentDaysByEmployee.set(c.employee_id, new Set());
    presentDaysByEmployee.get(c.employee_id)!.add(c.check_date);
  });

  const rows = (employees ?? []).map((e) => {
    const annualSalary = parseFloat(String(e.salary).replace(/[₹,\s]/g, "")) || 0;
    const monthlyBase = annualSalary / 12;
    const daysPresent = presentDaysByEmployee.get(e.id)?.size ?? 0;
    const computedSalary = Math.round((monthlyBase / WORKING_DAYS_PER_MONTH) * daysPresent);
    return [
      e.name,
      e.role,
      e.branch,
      inrCurrency(monthlyBase),
      daysPresent,
      WORKING_DAYS_PER_MONTH,
      inrCurrency(computedSalary),
    ];
  });

  return {
    columns: [
      "Employee",
      "Role",
      "Branch",
      "Monthly Base Salary",
      "Days Present",
      "Working Days",
      "Computed Salary",
    ],
    rows,
  };
}

/** One employee's real check-in history, for a per-employee downloadable summary. */
export async function fetchEmployeeAttendanceSummary(
  employeeId: string,
  opts: ReportOpts = {},
): Promise<ReportData> {
  let q = supabase
    .from("employee_checkins")
    .select("check_date, check_type, check_time, branch, status")
    .eq("employee_id", employeeId)
    .order("check_date", { ascending: false });
  if (opts.from) q = q.gte("check_date", opts.from);
  if (opts.to) q = q.lte("check_date", opts.to);
  const { data, error } = await q;
  if (error) throw error;

  return {
    columns: ["Date", "Type", "Time", "Branch", "Status"],
    rows: (data ?? []).map((r) => [r.check_date, r.check_type, r.check_time, r.branch, r.status]),
  };
}

// ─── Generic Reports module (src/routes/_app/reports/*) named calculators ──
// The seed `reports` table has several differently-named reports per
// category (e.g. sales has "Daily Sales Summary", "Product-wise Sales",
// "Branch Performance"…), but ReportListPage used to render the same
// category-wide dump for every row regardless of name — so "Product-wise
// Sales" showed the same invoice list as everything else. Each function here
// answers one specific report name with its own real calculation; anything
// unmatched (including user-added custom reports) falls back to
// fetchReportData(category).

function parseAmount(v: unknown): number {
  return parseFloat(String(v ?? "").replace(/[₹,\s]/g, "")) || 0;
}

/** Revenue and invoice count grouped by calendar month, from real sales bills. */
export async function fetchMonthlySalesReport(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("billing_sales_bills")
    .select("bill_date, amount_num, status")
    .eq("status", "Paid");
  if (error) throw error;

  const byMonth = new Map<string, { count: number; revenue: number }>();
  (data ?? [])
    .filter((r) => inRange(parseRowDate(r.bill_date), opts.from, opts.to))
    .forEach((r) => {
      const d = parseRowDate(r.bill_date)!;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += r.amount_num ?? 0;
      byMonth.set(key, cur);
    });

  const rows = [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, agg]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return [label, agg.count, inrCurrency(agg.revenue)];
    });

  return { columns: ["Month", "Invoices", "Total Revenue"], rows };
}

/** Units sold and revenue per product, from real stock_outward sale movements. */
export async function fetchProductWiseSales(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: outward, error } = await supabase
    .from("stock_outward")
    .select("product, qty, date, type")
    .eq("type", "Sale");
  if (error) throw error;
  const { data: products } = await supabase.from("products").select("name, category, price");

  const priceByName = new Map((products ?? []).map((p) => [p.name, p.price ?? 0]));
  const catByName = new Map((products ?? []).map((p) => [p.name, p.category]));

  const byProduct = new Map<string, number>();
  (outward ?? [])
    .filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to))
    .forEach((r) => {
      byProduct.set(r.product, (byProduct.get(r.product) ?? 0) + (r.qty ?? 0));
    });

  const rows = [...byProduct.entries()]
    .map(([name, qty]) => {
      const revenue = (priceByName.get(name) ?? 0) * qty;
      return [name, catByName.get(name) ?? "Uncategorized", qty, inrCurrency(revenue), revenue] as [
        string,
        string,
        number,
        string,
        number,
      ];
    })
    .sort((a, b) => b[4] - a[4])
    .map(([name, category, qty, revenue]) => [name, category, qty, revenue]);

  return { columns: ["Product", "Category", "Units Sold", "Revenue"], rows };
}

/** Revenue grouped by branch, from the branch-scoped sales bills table. */
export async function fetchBranchPerformance(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("billing_sales_bills_branches")
    .select("branch, amount, date, status")
    .eq("status", "Paid");
  if (error) throw error;

  const byBranch = new Map<string, { count: number; revenue: number }>();
  (data ?? [])
    .filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to))
    .forEach((r) => {
      const cur = byBranch.get(r.branch) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += parseAmount(r.amount);
      byBranch.set(r.branch, cur);
    });

  const rows = [...byBranch.entries()]
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([branch, agg]) => [branch, agg.count, inrCurrency(agg.revenue)]);

  return { columns: ["Branch", "Invoices", "Total Revenue"], rows };
}

/**
 * Present/absent/late/leave per employee for the selected period — built
 * from the real employees roster + their own employee_checkins/absent_records
 * rows (employee_attendance/daily_logs are demo tables with zero real
 * employees in them).
 */
export async function fetchMonthlyAttendanceReport(opts: ReportOpts = {}): Promise<ReportData> {
  const columns = [
    "Employee",
    "Designation",
    "Branch",
    "Present",
    "Absent",
    "Late",
    "Leave",
    "Attendance %",
  ];

  let empQuery = supabase.from("employees").select("id, name, role, branch");
  if (opts.branch) empQuery = empQuery.eq("branch", opts.branch);
  const { data: roster, error: rosterErr } = await empQuery;
  if (rosterErr) throw rosterErr;
  if (!roster || roster.length === 0) return { columns, rows: [] };

  const employeeIds = roster.map((r) => r.id);

  const { data: checkins, error: chkErr } = await supabase
    .from("employee_checkins")
    .select("employee_id, check_date, check_time, status")
    .eq("check_type", "check-in")
    .in("employee_id", employeeIds);
  if (chkErr) throw chkErr;

  const { data: leaves, error: leavesErr } = await supabase
    .from("absent_records")
    .select("employee_id, date, leave_type, status")
    .in("employee_id", employeeIds);
  if (leavesErr) throw leavesErr;

  const inWindow = (date: string) => inRange(parseRowDate(date), opts.from, opts.to);

  // Earliest check-in per employee per day decides present-vs-late.
  const firstByEmployeeDate = new Map<string, Map<string, number>>();
  (checkins ?? [])
    .filter((c) => (!c.status || c.status === "success") && inWindow(c.check_date))
    .forEach((c) => {
      const mins = parseTimeToMinutes(c.check_time);
      if (mins === null) return;
      const byDate = firstByEmployeeDate.get(c.employee_id) ?? new Map<string, number>();
      const prev = byDate.get(c.check_date);
      if (prev === undefined || mins < prev) byDate.set(c.check_date, mins);
      firstByEmployeeDate.set(c.employee_id, byDate);
    });

  // Only an *approved* leave counts as leave — a pending or declined request
  // must not silently excuse the day. A plain "Absent" status counts as absent.
  const absentByEmployee = new Map<string, number>();
  const leaveByEmployee = new Map<string, number>();
  (leaves ?? [])
    .filter((l) => inWindow(l.date))
    .forEach((l) => {
      if (l.leave_type && l.status === "Approved") {
        leaveByEmployee.set(l.employee_id, (leaveByEmployee.get(l.employee_id) ?? 0) + 1);
      } else if (l.status === "Absent") {
        absentByEmployee.set(l.employee_id, (absentByEmployee.get(l.employee_id) ?? 0) + 1);
      }
    });

  const rows = roster.map((r) => {
    const byDate = firstByEmployeeDate.get(r.id);
    const late = byDate
      ? [...byDate.values()].filter((m) => m > LATE_CUTOFF_MINUTES).length
      : 0;
    const present = byDate ? Math.max(0, byDate.size - late) : 0;
    const absent = absentByEmployee.get(r.id) ?? 0;
    const leave = leaveByEmployee.get(r.id) ?? 0;
    // Late arrivals still attended, so they count toward attendance %.
    const tracked = present + absent + late;
    const pct = tracked > 0 ? `${(((present + late) / tracked) * 100).toFixed(2)}%` : "0.00%";
    return [r.name, r.role || "Unassigned", r.branch, present, absent, late, leave, pct];
  });

  return { columns, rows };
}

/** Attendance-based performance ranking — the only real, non-fabricated performance signal available. */
export async function fetchPerformanceReview(opts: ReportOpts = {}): Promise<ReportData> {
  const base = await fetchMonthlyAttendanceReport(opts);
  const rows = [...base.rows].sort((a, b) => parseFloat(String(b[7])) - parseFloat(String(a[7])));
  return { columns: base.columns, rows };
}

/** Real employee activity log (employee_activity — the same table Employees › Activity Tracking reads). */
export async function fetchEmployeeActivityReport(opts: ReportOpts = {}): Promise<ReportData> {
  let q = supabase
    .from("employee_activity")
    .select("employee_name, branch, activity, timestamp, details")
    .order("timestamp", { ascending: false });
  if (opts.branch) q = q.eq("branch", opts.branch);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).filter((r) => inRange(parseRowDate(r.timestamp), opts.from, opts.to));
  return {
    columns: ["Employee", "Branch", "Activity", "Timestamp", "Details"],
    rows: rows.map((r) => [r.employee_name, r.branch, r.activity, r.timestamp, r.details ?? "-"]),
  };
}

export async function fetchLateArrivalSummary(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("late_arrivals")
    .select("date, employee_name, check_in_time, lateness_minutes, branch, status")
    .order("date", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to));
  return {
    columns: ["Date", "Employee", "Check-in Time", "Late By (min)", "Branch", "Status"],
    rows: rows.map((r) => [
      r.date,
      r.employee_name,
      r.check_in_time,
      r.lateness_minutes,
      r.branch,
      r.status,
    ]),
  };
}

/**
 * Absence + leave-request register. Includes the approval Status of every
 * row, so pending / approved / declined leave requests are all auditable
 * from the report. Branch-scoped when `opts.branch` is given.
 */
export async function fetchAbsenteeismReport(opts: ReportOpts = {}): Promise<ReportData> {
  let q = supabase
    .from("absent_records")
    .select("date, employee_id, employee_name, designation, branch, leave_type, reason, status")
    .order("date", { ascending: false });
  if (opts.branch) q = q.eq("branch", opts.branch);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to));
  return {
    columns: [
      "Date",
      "Employee Code",
      "Employee",
      "Designation",
      "Branch",
      "Leave Type",
      "Reason",
      "Status",
    ],
    rows: rows.map((r) => [
      r.date,
      r.employee_id,
      r.employee_name,
      r.designation,
      r.branch,
      r.leave_type ?? "-",
      r.reason ?? "-",
      r.status ?? "-",
    ]),
  };
}

/**
 * Leave requests only (rows carrying a leave_type), with their approval
 * state — the report view of the Absent Report's approval queue.
 */
export async function fetchLeaveRequestReport(opts: ReportOpts = {}): Promise<ReportData> {
  let q = supabase
    .from("absent_records")
    .select("date, employee_id, employee_name, designation, branch, leave_type, reason, status")
    .not("leave_type", "is", null)
    .order("date", { ascending: false });
  if (opts.branch) q = q.eq("branch", opts.branch);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).filter((r) => inRange(parseRowDate(r.date), opts.from, opts.to));
  return {
    columns: [
      "Date",
      "Employee Code",
      "Employee",
      "Designation",
      "Branch",
      "Leave Type",
      "Reason",
      "Approval Status",
    ],
    rows: rows.map((r) => [
      r.date,
      r.employee_id,
      r.employee_name,
      r.designation,
      r.branch,
      r.leave_type ?? "-",
      r.reason ?? "-",
      r.status ?? "-",
    ]),
  };
}

/** login_time/logout_time are plain display strings, not filterable dates — reports the full real log. */
export async function fetchEmployeeLoginActivity(): Promise<ReportData> {
  const { data, error } = await supabase
    .from("employee_logins")
    .select("employee_name, employee_role, branch, login_time, logout_time, duration, status")
    .order("login_time", { ascending: false });
  if (error) throw error;
  return {
    columns: ["Employee", "Role", "Branch", "Login Time", "Logout Time", "Duration", "Status"],
    rows: (data ?? []).map((r) => [
      r.employee_name,
      r.employee_role,
      r.branch,
      r.login_time,
      r.logout_time ?? "-",
      r.duration ?? "-",
      r.status,
    ]),
  };
}

/** Per-product stock value (price × stock) — the real number behind "Stock Valuation". */
export async function fetchStockValuation(): Promise<ReportData> {
  const { data, error } = await supabase
    .from("products")
    .select("sku, name, category, price, stock")
    .order("sku");
  if (error) throw error;
  return {
    columns: ["SKU", "Product", "Category", "Stock", "Unit Price", "Total Value"],
    rows: (data ?? []).map((p) => [
      p.sku,
      p.name,
      p.category,
      p.stock,
      inrCurrency(p.price ?? 0),
      inrCurrency((p.price ?? 0) * (p.stock ?? 0)),
    ]),
  };
}

/**
 * discount_campaigns has no revenue-per-campaign link, so a true ROI % can't
 * be computed honestly — this reports the real campaign fields instead of
 * fabricating a ratio.
 */
export async function fetchCampaignRoi(): Promise<ReportData> {
  const { data, error } = await supabase
    .from("discount_campaigns")
    .select("name, blurb, valid_till, used, status");
  if (error) throw error;
  return {
    columns: ["Campaign", "Description", "Valid Till", "Used", "Status"],
    rows: (data ?? []).map((c) => [c.name, c.blurb, c.valid_till, c.used, c.status]),
  };
}

/** Paid revenue minus completed/processing refunds — the real net figure, not a mock P&L. */
export async function fetchProfitAndLoss(opts: ReportOpts = {}): Promise<ReportData> {
  const { data: sales, error: salesErr } = await supabase
    .from("billing_sales_bills")
    .select("amount_num, bill_date, status")
    .eq("status", "Paid");
  if (salesErr) throw salesErr;
  const { data: refunds, error: refundsErr } = await supabase
    .from("billing_refunds")
    .select("amount_num, status");
  if (refundsErr) throw refundsErr;

  const revenue = (sales ?? [])
    .filter((r) => inRange(parseRowDate(r.bill_date), opts.from, opts.to))
    .reduce((s, r) => s + (r.amount_num ?? 0), 0);
  const refundTotal = (refunds ?? [])
    .filter((r) => r.status === "Completed" || r.status === "Processing")
    .reduce((s, r) => s + (r.amount_num ?? 0), 0);

  return {
    columns: ["Line Item", "Amount"],
    rows: [
      ["Gross Revenue (Paid Sales)", inrCurrency(revenue)],
      ["Less: Refunds", `-${inrCurrency(refundTotal)}`],
      ["Net Profit / Loss", inrCurrency(revenue - refundTotal)],
    ],
  };
}

/** Real payments grouped by payment mode — the actual cash-flow-by-channel breakdown. */
export async function fetchCashFlow(opts: ReportOpts = {}): Promise<ReportData> {
  const { data, error } = await supabase
    .from("billing_payments")
    .select("mode, amount_num, pay_date");
  if (error) throw error;

  const byMode = new Map<string, { count: number; total: number }>();
  (data ?? [])
    .filter((r) => inRange(parseRowDate(r.pay_date), opts.from, opts.to))
    .forEach((r) => {
      const cur = byMode.get(r.mode) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.amount_num ?? 0;
      byMode.set(r.mode, cur);
    });

  const rows = [...byMode.entries()]
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([mode, agg]) => [mode, agg.count, inrCurrency(agg.total)]);

  return { columns: ["Payment Mode", "Transactions", "Total Amount"], rows };
}

/**
 * Routes a specific report row's name to its own real calculator instead of
 * the category-wide generic dump every report in a category used to share.
 * Unmatched names (including user "Add New" custom reports) fall back to
 * fetchReportData(category).
 */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Mon–Fri count between two ISO dates, inclusive — used as "Total Working Days". */
function countWeekdays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  let count = 0;
  for (let d = from; d <= to; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Last completed Mon–Sun week (excludes the current, still-in-progress week). */
function lastCompletedWeekRange(now: Date): { from: string; to: string } {
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);
  return { from: isoDate(lastMonday), to: isoDate(lastSunday) };
}

/** Last completed month (excludes the current, still-in-progress month). */
function lastCompletedMonthRange(now: Date): { from: string; to: string } {
  const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return {
    from: `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-01`,
    to: `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-${pad2(lastDay)}`,
  };
}

/** Last completed calendar quarter (Jan–Mar / Apr–Jun / Jul–Sep / Oct–Dec). */
function lastCompletedQuarterRange(now: Date): { from: string; to: string; label: string } {
  const currentQuarter = Math.floor(now.getMonth() / 3); // 0-3
  const quarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const startMonth = quarter * 3;
  const lastDay = new Date(year, startMonth + 3, 0).getDate();
  return {
    from: `${year}-${pad2(startMonth + 1)}-01`,
    to: `${year}-${pad2(startMonth + 3)}-${pad2(lastDay)}`,
    label: `Q${quarter + 1} ${year}`,
  };
}

/**
 * Current year to date, but only through the last COMPLETED month — the
 * current, still-in-progress month is excluded so an "annual" figure never
 * looks artificially low from a partial month. January has no completed
 * month yet this year, so it falls back to an empty (from === to) range.
 */
function yearToDateExcludingCurrentMonth(now: Date): { from: string; to: string } {
  const from = `${now.getFullYear()}-01-01`;
  if (now.getMonth() === 0) return { from, to: from };
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  return { from, to: `${now.getFullYear()}-${pad2(now.getMonth())}-${pad2(lastDay)}` };
}

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/**
 * Human-readable "<Period> · <completed range>" label for the Attendance
 * Reports "Generate Report" dialog — matches whatever
 * fetchWeeklyAttendanceSummary / fetchMonthlyAttendanceSummary /
 * fetchQuarterlyAttendanceSummary / fetchAnnualAttendanceSummary will
 * actually compute when downloaded later, so the label never overstates a
 * still-in-progress period.
 */
export function attendancePeriodLabel(period: "weekly" | "monthly" | "quarterly" | "annual"): string {
  const now = new Date();
  const prefix = `${period.charAt(0).toUpperCase()}${period.slice(1)}`;
  if (period === "weekly") {
    const { from, to } = lastCompletedWeekRange(now);
    const fromLabel = new Date(`${from}T00:00:00`).toLocaleDateString("en-US", SHORT_DATE);
    const toDate = new Date(`${to}T00:00:00`);
    const toLabel = toDate.toLocaleDateString("en-US", { ...SHORT_DATE, year: "numeric" });
    return `${prefix} · ${fromLabel} - ${toLabel}`;
  }
  if (period === "quarterly") {
    return `${prefix} · ${lastCompletedQuarterRange(now).label}`;
  }
  if (period === "annual") {
    return `${prefix} · ${now.getFullYear()}`;
  }
  const { to } = lastCompletedMonthRange(now);
  const label = new Date(`${to}T00:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" });
  return `${prefix} · ${label}`;
}

/**
 * Per-employee attendance summary (Present/Absent/Late days) for an explicit
 * date range — built from the real employees roster + their own
 * employee_checkins/absent_records rows (employee_attendance is a demo
 * table with zero real employees in it). Backs the Weekly/Monthly/Quarterly/
 * Annual Attendance Summary reports, each supplying its own completed-period
 * range (see lastCompletedWeekRange etc.) so none of them count the current,
 * still-in-progress period.
 */
export async function fetchAttendanceSummary(
  branch: string | undefined,
  from: string,
  to: string,
): Promise<ReportData> {
  const dateRange = `${from} to ${to}`;
  const totalWorkingDays = countWeekdays(from, to);

  const columns = [
    "Date Range",
    "Employee Code",
    "Employee Name",
    "Branch",
    "Total Working Days",
    "Present Days",
    "Absent Days",
    "Late Days",
  ];

  let empQuery = supabase.from("employees").select("id, name, branch");
  if (branch) empQuery = empQuery.eq("branch", branch);
  const { data: employees, error: empError } = await empQuery;
  if (empError) throw empError;
  if (!employees || employees.length === 0) return { columns, rows: [] };

  const employeeIds = employees.map((e) => e.id);

  const { data: checkins, error: chkError } = await supabase
    .from("employee_checkins")
    .select("employee_id, check_date, check_time, status")
    .eq("check_type", "check-in")
    .gte("check_date", from)
    .lte("check_date", to)
    .in("employee_id", employeeIds);
  if (chkError) throw chkError;

  const { data: absences, error: absError } = await supabase
    .from("absent_records")
    .select("employee_id, date, status")
    .in("employee_id", employeeIds);
  if (absError) throw absError;

  // Earliest check-in per employee per day decides present-vs-late.
  const firstByEmployeeDate = new Map<string, Map<string, number>>();
  (checkins ?? [])
    .filter((c) => !c.status || c.status === "success")
    .forEach((c) => {
      const mins = parseTimeToMinutes(c.check_time);
      if (mins === null) return;
      const byDate = firstByEmployeeDate.get(c.employee_id) ?? new Map<string, number>();
      const prev = byDate.get(c.check_date);
      if (prev === undefined || mins < prev) byDate.set(c.check_date, mins);
      firstByEmployeeDate.set(c.employee_id, byDate);
    });

  const absentByEmployee = new Map<string, number>();
  (absences ?? [])
    .filter((a) => a.status === "Absent" && inRange(parseRowDate(a.date), from, to))
    .forEach((a) => {
      absentByEmployee.set(a.employee_id, (absentByEmployee.get(a.employee_id) ?? 0) + 1);
    });

  const rows = employees.map((e) => {
    const byDate = firstByEmployeeDate.get(e.id);
    const lateDays = byDate
      ? [...byDate.values()].filter((m) => m > LATE_CUTOFF_MINUTES).length
      : 0;
    const presentDays = byDate ? Math.max(0, byDate.size - lateDays) : 0;
    const absentDays = absentByEmployee.get(e.id) ?? 0;
    return [dateRange, e.id, e.name, e.branch, totalWorkingDays, presentDays, absentDays, lateDays];
  });

  return { columns, rows };
}

/** Reports the last completed Mon–Sun week (excludes the current week). */
export async function fetchWeeklyAttendanceSummary(branch?: string): Promise<ReportData> {
  const { from, to } = lastCompletedWeekRange(new Date());
  return fetchAttendanceSummary(branch, from, to);
}

/** Reports the last COMPLETED month, not the current still-in-progress one. */
export async function fetchMonthlyAttendanceSummary(branch?: string): Promise<ReportData> {
  const { from, to } = lastCompletedMonthRange(new Date());
  return fetchAttendanceSummary(branch, from, to);
}

/** Reports the last completed calendar quarter (excludes the current quarter). */
export async function fetchQuarterlyAttendanceSummary(branch?: string): Promise<ReportData> {
  const { from, to } = lastCompletedQuarterRange(new Date());
  return fetchAttendanceSummary(branch, from, to);
}

/**
 * Reports the current year to date, stopping at the end of the last
 * completed month — the current, still-in-progress month is excluded.
 */
export async function fetchAnnualAttendanceSummary(branch?: string): Promise<ReportData> {
  const { from, to } = yearToDateExcludingCurrentMonth(new Date());
  return fetchAttendanceSummary(branch, from, to);
}

export async function fetchNamedReport(
  category: ReportCategory,
  reportName: string,
  opts: ReportOpts = {},
): Promise<ReportData> {
  const name = reportName.toLowerCase();
  switch (category) {
    case "sales":
      if (/daily.?sales/.test(name)) return fetchDailySalesSummary(opts);
      if (/monthly.?sales/.test(name)) return fetchMonthlySalesReport(opts);
      if (/product.?wise/.test(name)) return fetchProductWiseSales(opts);
      if (/branch.?performance/.test(name)) return fetchBranchPerformance(opts);
      break;
    case "attendance":
      if (/leave/.test(name)) return fetchLeaveRequestReport(opts);
      if (/monthly.?attendance/.test(name)) return fetchMonthlyAttendanceReport(opts);
      if (/late.?arrival/.test(name)) return fetchLateArrivalSummary(opts);
      if (/absent/.test(name)) return fetchAbsenteeismReport(opts);
      break;
    case "employee":
      if (/performance.?review/.test(name)) return fetchPerformanceReview(opts);
      if (/login.?activity/.test(name)) return fetchEmployeeLoginActivity();
      break;
    case "inventory":
      if (/stock.?valuation/.test(name)) return fetchStockValuation();
      if (/fast.?moving/.test(name)) return fetchFastMovingItems(opts);
      if (/ageing|aging/.test(name)) return fetchStockAgeing(opts);
      break;
    case "discount":
      if (/campaign/.test(name)) return fetchCampaignRoi();
      break;
    case "financial":
      if (/profit.*loss|p&l/.test(name)) return fetchProfitAndLoss(opts);
      if (/cash.?flow/.test(name)) return fetchCashFlow(opts);
      if (/tax.?summary|gst/.test(name)) return fetchTaxSummary(opts);
      break;
  }
  return fetchReportData(category, opts);
}
