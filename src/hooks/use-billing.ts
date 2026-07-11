import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { loadTallyConfig, pushToTally, salesVoucherXml } from "@/lib/tally";
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

// Computed entirely client-side (rather than via the billing_dashboard_stats
// RPC) so the numbers stay correct without depending on redefining a
// security-definer SQL function this app has no DDL access to. The RPC's
// refund figures were also wrong: 'refundsThisWeek' summed every refund ever
// recorded with no date filter at all (a lifetime total mislabeled as a
// weekly count) — replaced with real daily + current-month refund totals.
export function useBillingDashboard() {
  return useQuery({
    queryKey: ["billing", "dashboard"],
    queryFn: async (): Promise<BillingDashboard> => {
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
      const lastMonthEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

      const [todayBills, pendingBills, monthBills, lastMonthBills, refunds] = await Promise.all([
        supabase.from("billing_sales_bills").select("amount_num").eq("bill_date", todayIso),
        supabase.from("billing_sales_bills").select("amount_num").eq("status", "Pending"),
        supabase.from("billing_sales_bills").select("amount_num").gte("bill_date", monthStart),
        supabase
          .from("billing_sales_bills")
          .select("amount_num")
          .gte("bill_date", lastMonthStart)
          .lt("bill_date", lastMonthEnd),
        // `*` so refund_date (added by 13_completion_pack.sql) is picked up
        // when present without erroring on older schemas.
        supabase.from("billing_refunds").select("*"),
      ]);
      if (todayBills.error) throw todayBills.error;
      if (pendingBills.error) throw pendingBills.error;
      if (monthBills.error) throw monthBills.error;
      if (refunds.error) throw refunds.error;

      const sumAmountNum = (rows: { amount_num?: number }[] | null) =>
        (rows ?? []).reduce((s, r) => s + (r.amount_num ?? 0), 0);

      const todayRevenue = sumAmountNum(todayBills.data);
      const pendingPayments = sumAmountNum(pendingBills.data);
      const thisMonthRevenue = sumAmountNum(monthBills.data);
      const lastMonthRevenue = sumAmountNum(lastMonthBills.data);

      const refundRows = (refunds.data ?? []) as (BillingRefund & { refund_date?: string })[];
      const refundsToday = refundRows
        .filter((r) => r.refund_date === todayIso)
        .reduce((s, r) => s + parseAmountNum(r.amount), 0);
      const refundsThisMonth = refundRows
        .filter((r) => (r.refund_date ?? "") >= monthStart)
        .reduce((s, r) => s + parseAmountNum(r.amount), 0);

      return {
        todayRevenue: formatINR(todayRevenue),
        todayRevenueHint: `${todayBills.data?.length ?? 0} invoice${(todayBills.data?.length ?? 0) !== 1 ? "s" : ""}`,
        pendingPayments: formatINR(pendingPayments),
        pendingPaymentsHint: `${pendingBills.data?.length ?? 0} invoice${(pendingBills.data?.length ?? 0) !== 1 ? "s" : ""}`,
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

export function useBillingRevenueTrend() {
  return useQuery({
    queryKey: ["billing", "revenue-trend"],
    queryFn: async (): Promise<BillingRevenueTrend[]> => {
      const { data, error } = await supabase
        .from("billing_revenue_trend_live")
        .select("d, revenue")
        .order("sort_key");
      if (error) throw error;
      return data as BillingRevenueTrend[];
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

function posTxnToBill(r: PosTxnBillRow): BillingSalesBill {
  const billDate = r.invoice_date || (r.created_at ? String(r.created_at).slice(0, 10) : "");
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
  const billDate = r.invoice_date || (r.created_at ? String(r.created_at).slice(0, 10) : "");
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
      ).select("*");
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

export function useBillingTaxInvoices(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "tax-invoices", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingTaxInvoice[]> => {
      let query = (
        allBranches
          ? supabase.from("billing_tax_invoices")
          : supabase.from("billing_tax_invoices_branches")
      ).select("invoice, date, gstin, taxable, cgst, sgst, total");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`invoice.ilike.${like(search)},gstin.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingTaxInvoice[];
    },
  });
}

export function useBillingTallyLog() {
  return useQuery({
    queryKey: ["billing", "tally-log"],
    queryFn: async (): Promise<BillingTallyRow[]> => {
      const { data, error } = await supabase
        .from("billing_tally_log")
        .select("time, voucher, reference, amount, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BillingTallyRow[];
    },
  });
}

export type TallyStats = {
  syncedToday: number;
  syncedTotal: number;
  pending: number;
  failed: number;
};

// Live stats derived from the sync log + the bills that haven't been pushed yet.
export function useTallyStats() {
  return useQuery({
    queryKey: ["billing", "tally-stats"],
    queryFn: async (): Promise<TallyStats> => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: log, error } = await supabase
        .from("billing_tally_log")
        .select("reference, status, created_at");
      if (error) throw error;
      const { data: bills } = await supabase.from("billing_sales_bills").select("invoice");

      const syncedRefs = new Set(
        (log ?? []).filter((r) => r.status === "Synced").map((r) => r.reference),
      );
      const pending = (bills ?? []).filter((b) => !syncedRefs.has(b.invoice)).length;
      const syncedToday = (log ?? []).filter(
        (r) => r.status === "Synced" && String(r.created_at ?? "").startsWith(todayIso),
      ).length;
      const failed = (log ?? []).filter((r) => r.status === "Failed").length;

      return { syncedToday, syncedTotal: syncedRefs.size, pending, failed };
    },
  });
}

export type TallySyncResult = { pushed: number; failed: number };

/**
 * Real sync: push every un-synced sales bill to the configured Tally HTTP
 * gateway as a Sales voucher and record each attempt in billing_tally_log.
 */
export function useTallySync() {
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

      const { data: bills, error: billsError } = await supabase
        .from("billing_sales_bills")
        .select("invoice, date, customer, amount, payment, status, bill_date, amount_num");
      if (billsError) throw billsError;

      const unsynced = (bills ?? []).filter((b) => !syncedRefs.has(b.invoice));
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

export function useBillingReports(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "reports", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingReport[]> => {
      let query = (
        allBranches ? supabase.from("billing_reports") : supabase.from("billing_reports_branches")
      ).select("report, period, generated, format");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.ilike("report", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingReport[];
    },
  });
}

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
    mutationFn: async (input: BillingSalesBill): Promise<BillingSalesBill> => {
      const amountNum = input.amount_num ?? (parseFloat(input.amount.replace(/[₹,\s]/g, "")) || 0);
      const billDate = input.bill_date ?? new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("billing_sales_bills").insert({
        invoice: input.invoice,
        date: input.date,
        customer: input.customer,
        amount: input.amount,
        payment: input.payment,
        status: input.status,
        bill_date: billDate,
        amount_num: amountNum,
      });
      if (error) throw error;
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
      input: BillingPayment & { amount_num?: number; pay_date?: string },
    ): Promise<BillingPayment> => {
      const amountNum = input.amount_num ?? (parseFloat(input.amount.replace(/[₹,\s]/g, "")) || 0);
      const payDate = input.pay_date ?? new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("billing_payments").insert({
        receipt: input.receipt,
        date: input.date,
        customer: input.customer,
        invoice: input.invoice,
        amount: input.amount,
        mode: input.mode,
        status: input.status,
        pay_date: payDate,
        amount_num: amountNum,
      });
      if (error) throw error;
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
    mutationFn: async (input: BillingTaxInvoice): Promise<BillingTaxInvoice> => {
      const { error } = await supabase.from("billing_tax_invoices").insert({
        invoice: input.invoice,
        date: input.date,
        gstin: input.gstin,
        taxable: input.taxable,
        cgst: input.cgst,
        sgst: input.sgst,
        total: input.total,
      });
      if (error) throw error;
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

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BillingRefund & { amount_num?: number }): Promise<BillingRefund> => {
      const amountNum = input.amount_num ?? (parseFloat(input.amount.replace(/[₹,\s]/g, "")) || 0);
      const { error } = await supabase.from("billing_refunds").insert({
        refund: input.refund,
        invoice: input.invoice,
        customer: input.customer,
        amount: input.amount,
        reason: input.reason,
        status: input.status,
        amount_num: amountNum,
      });
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("billing_sales_bills")
        .update({ status: "Refunded" })
        .eq("invoice", input.invoice);
      if (updateError) throw updateError;

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
