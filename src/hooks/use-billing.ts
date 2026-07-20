import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { applyStockMovement } from "@/lib/inventory-utils";
import { loadTallyConfig, pushToTally, salesVoucherXml } from "@/lib/tally";
import { localDateIso } from "@/lib/utils";
import { parseRowDate } from "@/lib/report-data";
import type {
  BillingDashboard,
  BillingPayment,
  BillingRefund,
  BillingReport,
  BillingRevenueTrend,
  BillingSalesBill,
  BillingTallyRow,
  BillingTaxInvoice,
} from "@/types/billing";

function like(value: string) {
  return `%${value}%`;
}

function formatINR(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  return "₹" + n.toLocaleString("en-IN");
}

function monthDelta(current: number, previous: number): string {
  if (previous === 0) return "";
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `Up ${pct}% vs last month` : `Down ${Math.abs(pct)}% vs last month`;
}

function parseAmountNum(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  return parseFloat(raw.replace(/[₹,\s]/g, "")) || 0;
}

// Unabbreviated ₹ formatting for per-invoice line amounts (unlike formatINR
// above, which abbreviates to Cr/L for dashboard KPI tiles).
function formatPlainINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Computed entirely client-side (rather than via the billing_dashboard_stats
// RPC) so the numbers stay correct without depending on redefining a
// security-definer SQL function this app has no DDL access to. The RPC's
// refund figures were also wrong: 'refundsThisWeek' summed every refund ever
// recorded with no date filter at all (a lifetime total mislabeled as a
// weekly count) — replaced with real daily + current-month refund totals.
// Branch-scoped viewers (branch_admin, cashier) must only ever see their own
// branch's revenue here — previously this queried the global
// billing_sales_bills table unconditionally, so every branch saw the same
// company-wide numbers regardless of who was logged in.
export function useBillingDashboard(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "dashboard", branch ?? "all"],
    queryFn: async (): Promise<BillingDashboard> => {
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

      // Bills: the global table has bill_date/amount_num (04_computed.sql);
      // the branch snapshot predates that migration and only has a free-text
      // `date` column + text `amount`, so both are normalized into one shape
      // and every bucket below (today/pending/month/last month) is derived
      // from a single fetch instead of a Supabase round-trip per bucket.
      type Bill = { amountNum: number; dateIso: string | null; status: string };
      let bills: Bill[];
      if (allBranches) {
        const { data, error } = await supabase
          .from("billing_sales_bills")
          .select("amount_num, bill_date, status");
        if (error) throw error;
        bills = (data ?? []).map((r) => ({
          amountNum: r.amount_num ?? 0,
          dateIso: r.bill_date ?? null,
          status: r.status ?? "",
        }));
      } else {
        const { data, error } = await supabase
          .from("billing_sales_bills_branches")
          .select("amount, date, status")
          .eq("branch", branch);
        if (error) throw error;
        bills = (data ?? []).map((r) => {
          const d = parseRowDate(r.date);
          return {
            amountNum: parseAmountNum(r.amount),
            dateIso: d
              ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
              : null,
            status: r.status ?? "",
          };
        });
      }

      // POS checkout (useCreatePosTransaction) never writes to
      // billing_sales_bills, so every bucket below (today/month/last month)
      // would silently exclude every POS sale — and, for a branch-scoped
      // viewer, would previously have summed every branch's POS sales
      // together — without this. Fetched once from lastMonthStart onward and
      // bucketed client-side alongside `bills`, same as the bills fetch above.
      let posQuery = supabase
        .from("pos_transactions")
        .select("amount, created_at")
        .gte("created_at", `${lastMonthStart}T00:00:00.000Z`);
      if (!allBranches) posQuery = posQuery.eq("branch", branch);
      const { data: posRows, error: posError } = await posQuery;
      if (posError) throw posError;
      const posBuckets = (posRows ?? []).map((r) => ({
        amountNum: parseAmountNum(r.amount),
        dateIso: String(r.created_at).slice(0, 10),
      }));

      const billsToday = bills.filter((b) => b.dateIso === todayIso);
      const pendingBills = bills.filter((b) => b.status === "Pending");
      const monthBills = bills.filter((b) => b.dateIso !== null && b.dateIso >= monthStart);
      const lastMonthBills = bills.filter(
        (b) => b.dateIso !== null && b.dateIso >= lastMonthStart && b.dateIso < monthStart,
      );

      const posToday = posBuckets.filter((p) => p.dateIso === todayIso);
      const posThisMonth = posBuckets.filter((p) => p.dateIso >= monthStart);
      const posLastMonth = posBuckets.filter(
        (p) => p.dateIso >= lastMonthStart && p.dateIso < monthStart,
      );
      const posTodayRevenue = posToday.reduce((s, p) => s + p.amountNum, 0);
      const posThisMonthRevenue = posThisMonth.reduce((s, p) => s + p.amountNum, 0);
      const posLastMonthRevenue = posLastMonth.reduce((s, p) => s + p.amountNum, 0);

      const billsTodaySum = billsToday.reduce((s, b) => s + b.amountNum, 0);
      const pendingPayments = pendingBills.reduce((s, b) => s + b.amountNum, 0);
      const thisMonthRevenue = monthBills.reduce((s, b) => s + b.amountNum, 0) + posThisMonthRevenue;
      const lastMonthRevenue =
        lastMonthBills.reduce((s, b) => s + b.amountNum, 0) + posLastMonthRevenue;
      const todayRevenue = billsTodaySum + posTodayRevenue;
      const todayInvoiceCount = billsToday.length + posToday.length;

      // `*` so refund_date (added by 13_completion_pack.sql) is picked up
      // when present without erroring on older schemas. billing_refunds_branches
      // has no date column at all, so refunds stay company-wide even for a
      // branch-scoped viewer — a known gap this doesn't attempt to fix.
      const { data: refundsData, error: refundsError } = await supabase
        .from("billing_refunds")
        .select("*");
      if (refundsError) throw refundsError;

      const refundRows = (refundsData ?? []) as (BillingRefund & { refund_date?: string })[];
      const refundsToday = refundRows
        .filter((r) => r.refund_date === todayIso)
        .reduce((s, r) => s + parseAmountNum(r.amount), 0);
      const refundsThisMonth = refundRows
        .filter((r) => (r.refund_date ?? "") >= monthStart)
        .reduce((s, r) => s + parseAmountNum(r.amount), 0);

      return {
        todayRevenue: formatINR(todayRevenue),
        todayRevenueHint: `${todayInvoiceCount} invoice${todayInvoiceCount !== 1 ? "s" : ""}`,
        pendingPayments: formatINR(pendingPayments),
        pendingPaymentsHint: `${pendingBills.length} invoice${pendingBills.length !== 1 ? "s" : ""}`,
        thisMonth: formatINR(thisMonthRevenue),
        thisMonthDelta: monthDelta(thisMonthRevenue, lastMonthRevenue),
        refunds: formatINR(refundsToday),
        refundsHint: `${formatINR(refundsThisMonth)} this month`,
        // tally stats unchanged — still sourced from billing_dashboard seed row
        tallySyncedToday: "",
        tallySyncedHint: "",
        tallyPendingSync: "",
        tallyPendingHint: "",
        tallyFailed: "",
        tallyFailedHint: "",
      };
    },
  });
}

// billing_revenue_trend_live only ever summed billing_sales_bills — the
// manual "Create Invoice" flow — so it went blank the moment a shop's real
// revenue came entirely through POS checkout instead (POS never writes to
// billing_sales_bills). Computed client-side now, from paid invoices AND POS
// sales together, for both the all-branches and single-branch views.
export function useBillingRevenueTrend(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "revenue-trend", branch ?? "all"],
    queryFn: async (): Promise<BillingRevenueTrend[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 13);
      const sinceIso = localDateIso(since);

      const byDate = new Map<string, number>();
      const bump = (sortKey: string, amount: number) =>
        byDate.set(sortKey, (byDate.get(sortKey) ?? 0) + amount);

      if (allBranches) {
        const { data, error } = await supabase
          .from("billing_sales_bills")
          .select("amount_num, bill_date, status")
          .eq("status", "Paid")
          .gte("bill_date", sinceIso);
        if (error) throw error;
        (data ?? []).forEach((r) => {
          if (r.bill_date) bump(r.bill_date, r.amount_num ?? 0);
        });
      } else {
        const { data, error } = await supabase
          .from("billing_sales_bills_branches")
          .select("amount, date, status")
          .eq("branch", branch)
          .eq("status", "Paid");
        if (error) throw error;
        (data ?? []).forEach((r) => {
          const d = parseRowDate(r.date);
          if (!d || d < since) return;
          bump(localDateIso(d), parseAmountNum(r.amount));
        });
      }

      let posQuery = supabase
        .from("pos_transactions")
        .select("amount, created_at")
        .gte("created_at", since.toISOString());
      if (!allBranches) posQuery = posQuery.eq("branch", branch);
      const { data: posRows, error: posError } = await posQuery;
      if (posError) throw posError;
      (posRows ?? []).forEach((r) => {
        bump(String(r.created_at).slice(0, 10), parseAmountNum(r.amount));
      });

      return [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sortKey, revenue]) => {
          const d = new Date(`${sortKey}T00:00:00`);
          const label = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })}`;
          return { d: label, revenue: Math.round(revenue) };
        });
    },
  });
}

type PosTxnBillRow = {
  invoice: string;
  amount: string;
  payment: string;
  status: string;
  time?: string;
  total?: number;
  created_at?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_dob?: string;
  customer_gstin?: string;
  invoice_date?: string;
};

type PosTxnTaxRow = {
  invoice: string;
  customer_gstin: string | null;
  subtotal?: number | null;
  discount?: number | null;
  gst?: number | null;
  total?: number | null;
  created_at?: string;
  invoice_date?: string;
};

function posTxnToTaxInvoice(r: PosTxnTaxRow): BillingTaxInvoice {
  const billDate = r.invoice_date || (r.created_at ? localDateIso(new Date(r.created_at)) : "");
  const taxable = (r.subtotal ?? 0) - (r.discount ?? 0);
  const gstHalf = (r.gst ?? 0) / 2;
  return {
    invoice: r.invoice,
    date: billDate ? isoToDisplayDate(billDate) : "",
    gstin: r.customer_gstin ?? "",
    taxable: formatPlainINR(taxable),
    cgst: formatPlainINR(gstHalf),
    sgst: formatPlainINR(gstHalf),
    total: formatPlainINR(r.total ?? 0),
  };
}

function posTxnToBill(r: PosTxnBillRow): BillingSalesBill {
  const billDate = r.invoice_date || (r.created_at ? localDateIso(new Date(r.created_at)) : "");
  return {
    invoice: r.invoice,
    date: billDate || r.time || "",
    customer: r.customer_name || "Walk-in",
    amount: r.amount,
    payment: r.payment,
    status: r.status,
    bill_date: billDate || undefined,
    amount_num: typeof r.total === "number" ? r.total : parseAmountNum(r.amount),
    customerMobile: r.customer_mobile || undefined,
    customerDob: r.customer_dob || undefined,
    customerGstin: r.customer_gstin || undefined,
    invoiceDate: r.invoice_date || undefined,
  };
}

// Sales bills are now sourced directly from POS transactions (each completed
// sale is a bill) rather than the standalone billing_sales_bills table, so bills
// appear automatically the moment a sale is rung up. Latest sale shows first.
export function useBillingSalesBills(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "sales-bills", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingSalesBill[]> => {
      if (allBranches) {
        // Full shape includes the customer/invoice-date columns from
        // supabase/pos/07_customer_details.sql; fall back to the base columns
        // if that migration hasn't been run yet.
        const FULL =
          "invoice, amount, payment, status, total, created_at, customer_name, " +
          "customer_mobile, customer_dob, customer_gstin, invoice_date";
        const buildGlobal = (cols: string, withCustomerSearch: boolean) => {
          let q = supabase
            .from("pos_transactions")
            .select(cols)
            .order("created_at", { ascending: false });
          if (search)
            q = q.or(
              withCustomerSearch
                ? `invoice.ilike.${like(search)},customer_name.ilike.${like(search)}`
                : `invoice.ilike.${like(search)}`,
            );
          return q;
        };

        const full = await buildGlobal(FULL, true);
        if (!full.error) return (full.data as unknown as PosTxnBillRow[]).map(posTxnToBill);

        const base = await buildGlobal("invoice, time, amount, payment, status, created_at", false);
        if (base.error) throw base.error;
        return (base.data as unknown as PosTxnBillRow[]).map(posTxnToBill);
      }

      // Branch view reads the seeded per-branch snapshot (no customer columns).
      let q = supabase
        .from("pos_transactions_branches")
        .select("invoice, time, amount, payment, status")
        .eq("branch", branch)
        .order("invoice", { ascending: false });
      if (search) q = q.or(`invoice.ilike.${like(search)},cashier.ilike.${like(search)}`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as PosTxnBillRow[]).map(posTxnToBill);
    },
  });
}

// "2026-11-12" -> "12 Nov" (falls back to the raw string if it isn't ISO).
function isoToDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
}

function posTxnToPayment(r: PosTxnBillRow): BillingPayment {
  const billDate = r.invoice_date || (r.created_at ? localDateIso(new Date(r.created_at)) : "");
  const digits = r.invoice.replace(/\D/g, "");
  return {
    date: billDate ? isoToDisplayDate(billDate) : r.time || "",
    receipt: digits ? `REC-${digits}` : r.invoice,
    customer: r.customer_name || "Walk-in",
    invoice: r.invoice,
    amount: r.amount,
    mode: r.payment,
    // A completed sale is a received payment; keep other statuses (Refunded/Pending) as-is.
    status: r.status === "Completed" ? "Received" : r.status,
    pay_date: billDate || undefined,
  };
}

// Payments are the money side of POS sales, so they're sourced straight from
// pos_transactions (every completed sale is a received payment). Latest first.
export function useBillingPayments(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "payments", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingPayment[]> => {
      if (allBranches) {
        const FULL =
          "invoice, amount, payment, status, time, created_at, customer_name, invoice_date";
        const buildGlobal = (cols: string, withCustomerSearch: boolean) => {
          let q = supabase
            .from("pos_transactions")
            .select(cols)
            .order("created_at", { ascending: false });
          if (search)
            q = q.or(
              withCustomerSearch
                ? `invoice.ilike.${like(search)},customer_name.ilike.${like(search)}`
                : `invoice.ilike.${like(search)}`,
            );
          return q;
        };

        const full = await buildGlobal(FULL, true);
        if (!full.error) return (full.data as unknown as PosTxnBillRow[]).map(posTxnToPayment);

        const base = await buildGlobal("invoice, time, amount, payment, status, created_at", false);
        if (base.error) throw base.error;
        return (base.data as unknown as PosTxnBillRow[]).map(posTxnToPayment);
      }

      let q = supabase
        .from("pos_transactions_branches")
        .select("invoice, time, amount, payment, status")
        .eq("branch", branch)
        .order("invoice", { ascending: false });
      if (search) q = q.or(`invoice.ilike.${like(search)},cashier.ilike.${like(search)}`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as PosTxnBillRow[]).map(posTxnToPayment);
    },
  });
}

export function useBillingRefunds(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "refunds", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingRefund[]> => {
      // `*` so the optional refund_date column (supabase/13_completion_pack.sql)
      // is picked up when present without breaking older schemas.
      let query = (
        allBranches ? supabase.from("billing_refunds") : supabase.from("billing_refunds_branches")
      )
        .select("*")
        // Newest first — refund numbers are assigned sequentially (see
        // useNextRefundNumber), and billing_refunds has no created_at column
        // to sort by instead.
        .order("refund", { ascending: false });
      if (!allBranches) query = query.eq("branch", branch);
      if (search)
        query = query.or(
          `refund.ilike.${like(search)},invoice.ilike.${like(search)},customer.ilike.${like(search)}`,
        );
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingRefund[];
    },
  });
}

// A tax invoice is any completed sale where the customer supplied a GSTIN at
// checkout (POS "Collect Payment" step) — derived straight from
// pos_transactions, the same source useBillingSalesBills/useBillingPayments
// read, instead of the standalone billing_tax_invoices table (which can't
// stay in sync with sales rung up at the POS). A sale with no GSTIN captured
// simply isn't a tax invoice and is excluded.
export function useBillingTaxInvoices(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "tax-invoices", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingTaxInvoice[]> => {
      if (allBranches) {
        let q = supabase
          .from("pos_transactions")
          .select(
            "invoice, subtotal, discount, gst, total, customer_gstin, created_at, invoice_date",
          )
          .not("customer_gstin", "is", null)
          .neq("customer_gstin", "")
          .order("created_at", { ascending: false });
        if (search) q = q.or(`invoice.ilike.${like(search)},customer_gstin.ilike.${like(search)}`);
        const { data, error } = await q;
        if (error) throw error;
        return (data as unknown as PosTxnTaxRow[]).map(posTxnToTaxInvoice);
      }

      // No live per-branch source for customer GSTIN yet (pos_transactions_branches
      // predates supabase/pos/07_customer_details.sql) — keep reading the seeded
      // per-branch snapshot table.
      let query = supabase
        .from("billing_tax_invoices_branches")
        .select("invoice, date, gstin, taxable, cgst, sgst, total")
        .eq("branch", branch);
      if (search) query = query.or(`invoice.ilike.${like(search)},gstin.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingTaxInvoice[];
    },
  });
}

// Past attempts (Synced/Failed) from billing_tally_log, PLUS a synthetic
// "Pending" row for every real sales bill that's never been attempted at
// all — otherwise this log only ever showed history and gave no visibility
// into what "Sync Now" would actually push next. Bills come from both
// billing_sales_bills (legacy manual invoices, Super Admin only — see below)
// and pos_transactions (the real, live sales channel — see
// useBillingSalesBills / posTxnToBill).
//
// Branch scoping: pos_transactions carries a branch column, so a Branch
// Admin only ever sees their own branch's vouchers, synced or not — and
// billing_tally_log has no branch column at all, so for a scoped caller it's
// filtered down to just the references that belong to their branch. Super
// Admin (no branch / "all") sees every branch's vouchers, same as before.
// billing_sales_bills has no branch dimension either, so it's Super-Admin-only
// — a Branch Admin syncing it would leak every other branch's legacy invoices.
export function useBillingTallyLog(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "tally-log", branch ?? "all"],
    queryFn: async (): Promise<BillingTallyRow[]> => {
      const { data: log, error } = await supabase
        .from("billing_tally_log")
        .select("time, voucher, reference, amount, status")
        .order("created_at", { ascending: false });
      if (error) throw error;

      let posQuery = supabase.from("pos_transactions").select("invoice, amount, time");
      if (!allBranches) posQuery = posQuery.eq("branch", branch);
      const { data: posRows } = await posQuery;

      const legacyBills: { invoice: string; amount: string; bill_date: string | null }[] =
        allBranches
          ? ((await supabase.from("billing_sales_bills").select("invoice, amount, bill_date"))
              .data ?? [])
          : [];

      const branchInvoices = new Set([
        ...(posRows ?? []).map((r) => r.invoice),
        ...legacyBills.map((b) => b.invoice),
      ]);
      const logRows = (
        allBranches
          ? (log ?? [])
          : (log ?? []).filter((r) => branchInvoices.has(r.reference))
      ) as BillingTallyRow[];

      // Already-attempted invoices (Synced or Failed) get their real history
      // row above — skip them here to avoid a duplicate entry for the same
      // invoice.
      const attemptedRefs = new Set(logRows.map((r) => r.reference));
      const pendingRows: BillingTallyRow[] = [];
      const seen = new Set<string>();
      const addPending = (invoice: string, amount: string, time: string) => {
        if (attemptedRefs.has(invoice) || seen.has(invoice)) return;
        seen.add(invoice);
        pendingRows.push({ time, voucher: "Sales", reference: invoice, amount, status: "Pending" });
      };
      legacyBills.forEach((b) => addPending(b.invoice, b.amount, b.bill_date ?? ""));
      (posRows ?? []).forEach((r) => addPending(r.invoice, r.amount, r.time ?? ""));

      return [...logRows, ...pendingRows];
    },
  });
}

export type TallyStats = {
  syncedToday: number;
  syncedTotal: number;
  pending: number;
  failed: number;
};

// Live stats derived from the sync log + the bills that haven't been pushed
// yet, scoped to the caller's branch the same way useBillingTallyLog is (see
// its comment for why). Sales bills now come from POS checkout (see
// useBillingSalesBills) — billing_sales_bills is a legacy manual-invoice
// table that's typically empty, so counting only its rows silently missed
// every real POS sale.
export function useTallyStats(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "tally-stats", branch ?? "all"],
    queryFn: async (): Promise<TallyStats> => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: log, error } = await supabase
        .from("billing_tally_log")
        .select("reference, status, created_at");
      if (error) throw error;

      let posQuery = supabase.from("pos_transactions").select("invoice");
      if (!allBranches) posQuery = posQuery.eq("branch", branch);
      const { data: posTxns } = await posQuery;
      const bills: { invoice: string }[] = allBranches
        ? ((await supabase.from("billing_sales_bills").select("invoice")).data ?? [])
        : [];

      const allInvoices = new Set([
        ...bills.map((b) => b.invoice),
        ...(posTxns ?? []).map((p) => p.invoice),
      ]);
      const scopedLog = allBranches
        ? (log ?? [])
        : (log ?? []).filter((r) => allInvoices.has(r.reference));

      const syncedRefs = new Set(
        scopedLog.filter((r) => r.status === "Synced").map((r) => r.reference),
      );
      const pending = [...allInvoices].filter((inv) => !syncedRefs.has(inv)).length;
      const syncedToday = scopedLog.filter(
        (r) => r.status === "Synced" && String(r.created_at ?? "").startsWith(todayIso),
      ).length;
      const failed = scopedLog.filter((r) => r.status === "Failed").length;

      return { syncedToday, syncedTotal: syncedRefs.size, pending, failed };
    },
  });
}

export type TallySyncResult = { pushed: number; failed: number };

/**
 * Real sync: push every un-synced sales bill to the configured Tally HTTP
 * gateway as a Sales voucher and record each attempt in billing_tally_log.
 * Pulls from pos_transactions (every completed POS sale — the real, live
 * sales channel; see useBillingSalesBills / posTxnToBill), scoped to the
 * caller's branch, plus billing_sales_bills (the legacy manual-invoice table,
 * which has no branch column) for Super Admin only — a Branch Admin must
 * never push another branch's bills to Tally.
 */
export function useTallySync(branch?: string) {
  const allBranches = !branch || branch === "all";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<TallySyncResult> => {
      const config = await loadTallyConfig();

      const { data: log, error: logError } = await supabase
        .from("billing_tally_log")
        .select("reference, status");
      if (logError) throw logError;
      const syncedRefs = new Set(
        (log ?? []).filter((r) => r.status === "Synced").map((r) => r.reference),
      );

      let legacyBills: BillingSalesBill[] = [];
      if (allBranches) {
        const { data, error: billsError } = await supabase
          .from("billing_sales_bills")
          .select("invoice, date, customer, amount, payment, status, bill_date, amount_num");
        if (billsError) throw billsError;
        legacyBills = data ?? [];
      }

      let posQuery = supabase
        .from("pos_transactions")
        .select(
          "invoice, amount, payment, status, total, created_at, customer_name, invoice_date",
        );
      if (!allBranches) posQuery = posQuery.eq("branch", branch);
      const { data: posRows, error: posError } = await posQuery;
      if (posError) throw posError;
      const posBills = (posRows ?? []).map((r) => posTxnToBill(r as PosTxnBillRow));

      const seen = new Set<string>();
      const unsynced = [...legacyBills, ...posBills].filter((b) => {
        if (syncedRefs.has(b.invoice) || seen.has(b.invoice)) return false;
        seen.add(b.invoice);
        return true;
      });
      if (unsynced.length === 0) return { pushed: 0, failed: 0 };

      let pushed = 0;
      let failed = 0;
      const timeLabel = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const bill of unsynced) {
        const ok = await pushToTally(config, salesVoucherXml(bill, config.company));
        const { error: insertError } = await supabase.from("billing_tally_log").insert({
          time: timeLabel,
          voucher: "Sales",
          reference: bill.invoice,
          amount: bill.amount,
          status: ok ? "Synced" : "Failed",
        });
        if (insertError) throw insertError;
        if (ok) pushed++;
        else failed++;
      }

      return { pushed, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

// Report definitions (Daily Sales Summary, Tax Summary, etc.) always come
// from the global billing_reports table regardless of which branch is
// selected — they're the same catalog of report types everywhere, only the
// downloaded CONTENT differs by branch (see opts()/fetchNamedBillingReport
// in reports.tsx). billing_reports_branches is completely empty — nothing
// has ever actually been created with a branch attached — so switching the
// filter to any branch used to show zero reports instead of the same 4.
export function useBillingReports(search?: string) {
  return useQuery({
    queryKey: ["billing", "reports", search ?? ""],
    queryFn: async (): Promise<BillingReport[]> => {
      let query = supabase.from("billing_reports").select("report, period, generated, format");
      if (search) query = query.ilike("report", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingReport[];
    },
  });
}

// Branch-scoped sessions pin every billing page to one branch; their writes go
// to BOTH the global table (super admin "All Branches" view) and the
// `_branches` junction row (their own branch view).
function realBranch(branch?: string): string | null {
  return branch && branch !== "all" ? branch : null;
}

// Only writes to the global table — billing_reports_branches is dead (see
// useBillingReports above), so there's nothing to dual-write.
export function useCreateBillingReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BillingReport): Promise<BillingReport> => {
      const { error } = await supabase.from("billing_reports").insert({
        report: input.report,
        period: input.period,
        generated: input.generated,
        format: input.format,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "reports"] });
    },
  });
}

export function useBillingBranches() {
  return useQuery({
    queryKey: ["billing", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}

export function useCreateBillingInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BillingSalesBill & { branch?: string },
    ): Promise<BillingSalesBill> => {
      const amountNum = input.amount_num ?? (parseFloat(input.amount.replace(/[₹,\s]/g, "")) || 0);
      const billDate = input.bill_date ?? new Date().toISOString().slice(0, 10);
      const row = {
        invoice: input.invoice,
        date: input.date,
        customer: input.customer,
        amount: input.amount,
        payment: input.payment,
        status: input.status,
        bill_date: billDate,
        amount_num: amountNum,
      };
      const { error } = await supabase.from("billing_sales_bills").insert(row);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("billing_sales_bills_branches")
          .insert({ ...row, branch });
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useNextInvoiceNumber() {
  return useQuery({
    queryKey: ["billing", "next-invoice-number"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("billing_sales_bills")
        .select("invoice")
        .order("invoice", { ascending: false })
        .limit(1);
      if (error) throw error;
      const lastNum = data?.[0]?.invoice ? parseInt(data[0].invoice.replace(/\D/g, ""), 10) : 10248;
      return `INV-${lastNum + 1}`;
    },
  });
}

export function useNextReceiptNumber() {
  return useQuery({
    queryKey: ["billing", "next-receipt-number"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("billing_payments")
        .select("receipt")
        .order("receipt", { ascending: false })
        .limit(1);
      if (error) throw error;
      const lastNum = data?.[0]?.receipt ? parseInt(data[0].receipt.replace(/\D/g, ""), 10) : 4521;
      return `REC-${lastNum + 1}`;
    },
  });
}

export function useCreateBillingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BillingPayment & { amount_num?: number; pay_date?: string; branch?: string },
    ): Promise<BillingPayment> => {
      const amountNum = input.amount_num ?? (parseFloat(input.amount.replace(/[₹,\s]/g, "")) || 0);
      const payDate = input.pay_date ?? new Date().toISOString().slice(0, 10);
      const row = {
        receipt: input.receipt,
        date: input.date,
        customer: input.customer,
        invoice: input.invoice,
        amount: input.amount,
        mode: input.mode,
        status: input.status,
        pay_date: payDate,
        amount_num: amountNum,
      };
      const { error } = await supabase.from("billing_payments").insert(row);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("billing_payments_branches")
          .insert({ ...row, branch });
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useCreateTaxInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BillingTaxInvoice & { branch?: string },
    ): Promise<BillingTaxInvoice> => {
      const row = {
        invoice: input.invoice,
        date: input.date,
        gstin: input.gstin,
        taxable: input.taxable,
        cgst: input.cgst,
        sgst: input.sgst,
        total: input.total,
      };
      const { error } = await supabase.from("billing_tax_invoices").insert(row);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("billing_tax_invoices_branches")
          .insert({ ...row, branch });
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useNextRefundNumber() {
  return useQuery({
    queryKey: ["billing", "next-refund-number"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("billing_refunds")
        .select("refund")
        .order("refund", { ascending: false })
        .limit(1);
      if (error) throw error;
      const lastNum = data?.[0]?.refund ? parseInt(data[0].refund.replace(/\D/g, ""), 10) : 199;
      return `REF-${lastNum + 1}`;
    },
  });
}

export type RefundLineInput = { sku: string; name: string; qty: number; unitPrice: number };

/** SKU -> total quantity already refunded across prior refunds against this
 * invoice — lets the New Refund dialog grey out/cap products that have
 * already been returned instead of letting the same units be refunded twice.
 * Table is added by supabase/billing/09_refund_items.sql; treat a missing
 * table (PGRST205) as "nothing refunded yet" rather than failing the lookup. */
export function useRefundedQtyByInvoice(invoice: string) {
  return useQuery({
    queryKey: ["billing", "refund-items", invoice],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("billing_refund_items")
        .select("sku, qty")
        .eq("invoice", invoice);
      if (error) {
        if (error.code === "PGRST205") return {};
        throw error;
      }
      const totals: Record<string, number> = {};
      for (const row of data ?? []) {
        totals[row.sku as string] = (totals[row.sku as string] ?? 0) + (row.qty as number);
      }
      return totals;
    },
    enabled: invoice.length > 0,
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BillingRefund & { amount_num?: number; items?: RefundLineInput[]; branch?: string },
    ): Promise<BillingRefund> => {
      const amountNum = input.amount_num ?? (parseFloat(input.amount.replace(/[₹,\s]/g, "")) || 0);
      const explicitItems = input.items && input.items.length > 0 ? input.items : null;

      // Legacy path (no item-level detail supplied, e.g. the Sales Bills quick
      // "Refund" button): only the FIRST refund against an invoice restores
      // stock, using the sale's full line items — a second refund row on the
      // same invoice must not put the same goods back a second time.
      let firstRefund = false;
      if (!explicitItems) {
        const { data: priorRefunds } = await supabase
          .from("billing_refunds")
          .select("refund")
          .eq("invoice", input.invoice)
          .limit(1);
        firstRefund = !priorRefunds || priorRefunds.length === 0;
      }

      const refundRow = {
        refund: input.refund,
        invoice: input.invoice,
        customer: input.customer,
        amount: input.amount,
        reason: input.reason,
        status: input.status,
        amount_num: amountNum,
      };
      const { error } = await supabase.from("billing_refunds").insert(refundRow);
      if (error) throw error;

      const refundBranch = realBranch(input.branch);
      if (refundBranch) {
        const { error: branchError } = await supabase
          .from("billing_refunds_branches")
          .insert({ ...refundRow, branch: refundBranch });
        if (branchError) throw branchError;
      }

      // Persist which lines this refund covered so a later refund against the
      // same invoice can see what's already been returned (see
      // useRefundedQtyByInvoice). Best-effort like the stock restore below —
      // table may not exist yet if 09_refund_items.sql hasn't been run.
      if (explicitItems) {
        const { error: itemsError } = await supabase.from("billing_refund_items").insert(
          explicitItems.map((i) => ({
            refund: input.refund,
            invoice: input.invoice,
            sku: i.sku,
            qty: i.qty,
          })),
        );
        if (itemsError && itemsError.code !== "PGRST205") {
          console.error("Failed to record refund line items:", itemsError);
        }
      }

      const { error: updateError } = await supabase
        .from("billing_sales_bills")
        .update({ status: "Refunded" })
        .eq("invoice", input.invoice);
      if (updateError) throw updateError;

      // Refunding returns goods to the shelf: put the refunded lines back into
      // products (the stock source of truth). Best-effort — the refund is
      // already recorded, so a stock hiccup shouldn't read back as "Could not
      // create refund". Two sources for which lines to restore:
      //   - explicitItems: the New Refund dialog's product picker — the cashier
      //     chose specific products/quantities, so restore exactly those (this
      //     is what makes a PARTIAL refund of one item out of a multi-item sale
      //     restore only that item, not the whole order).
      //   - legacy whole-invoice fallback: no item-level detail was supplied,
      //     so restore the sale's full line items, once, on the first refund
      //     only. A manually-created invoice with no POS line items has
      //     nothing to restore either way.
      try {
        // Restored to the SAME stock the sale drew down: a branch's refund puts
        // goods back on that branch's shelf, not into the central warehouse.
        if (explicitItems) {
          await applyStockMovement(
            explicitItems.map((i) => ({ sku: i.sku, qty: i.qty })),
            "in",
            refundBranch ?? undefined,
          );
        } else if (firstRefund) {
          const { data: items } = await supabase
            .from("pos_transaction_items")
            .select("sku, qty")
            .eq("invoice", input.invoice);
          if (items && items.length > 0) {
            await applyStockMovement(
              items.map((i) => ({ sku: i.sku as string, qty: i.qty as number })),
              "in",
              refundBranch ?? undefined,
            );
          }
        }
      } catch (stockError) {
        console.error("Failed to restore stock after refund:", stockError);
      }

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      // Stock returned to the shelf — refresh inventory-derived views too.
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// A refund's status used to only be set once at creation (supabase/billing/
// 10_refund_status_update.sql adds the missing update policy) — this lets
// Refund Management change it in place as a refund moves from Processing to
// Completed/On Hold/Rejected.
export function useUpdateRefundStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      refund,
      status,
    }: {
      refund: string;
      status: string;
    }): Promise<{ refund: string; status: string }> => {
      const { error } = await supabase
        .from("billing_refunds")
        .update({ status })
        .eq("refund", refund);
      if (error) throw error;
      return { refund, status };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "refunds"] }),
  });
}

// Sales Bills reads from pos_transactions (global) / pos_transactions_branches
// (per-branch view) — see useBillingSalesBills — so delete targets whichever
// table the row actually came from.
export function useDeleteSalesBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invoice: string; branch?: string }): Promise<string> => {
      const branch = realBranch(input.branch);
      if (branch) {
        const { error } = await supabase
          .from("pos_transactions_branches")
          .delete()
          .eq("invoice", input.invoice)
          .eq("branch", branch);
        if (error) throw error;
        return input.invoice;
      }
      const { error } = await supabase
        .from("pos_transactions")
        .delete()
        .eq("invoice", input.invoice);
      if (error) throw error;
      return input.invoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
}
