import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
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

interface DashboardRaw {
  todayRevenue: number;
  todayInvoiceCount: number;
  pendingPayments: number;
  pendingCount: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  refundsAmount: number;
  refundsThisWeek: number;
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

export function useBillingDashboard() {
  return useQuery({
    queryKey: ["billing", "dashboard"],
    queryFn: async (): Promise<BillingDashboard> => {
      const { data, error } = await supabase.rpc("billing_dashboard_stats");
      if (error) throw error;
      const r = data as DashboardRaw;
      return {
        todayRevenue: formatINR(r.todayRevenue),
        todayRevenueHint: `${r.todayInvoiceCount} invoice${r.todayInvoiceCount !== 1 ? "s" : ""}`,
        pendingPayments: formatINR(r.pendingPayments),
        pendingPaymentsHint: `${r.pendingCount} invoice${r.pendingCount !== 1 ? "s" : ""}`,
        thisMonth: formatINR(r.thisMonthRevenue),
        thisMonthDelta: monthDelta(r.thisMonthRevenue, r.lastMonthRevenue),
        refunds: formatINR(r.refundsAmount),
        refundsHint: `${r.refundsThisWeek} this week`,
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

export function useBillingSalesBills(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "sales-bills", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingSalesBill[]> => {
      let query = (
        allBranches
          ? supabase.from("billing_sales_bills")
          : supabase.from("billing_sales_bills_branches")
      )
        .select("invoice, date, customer, amount, payment, status")
        .order("invoice", { ascending: false });
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`invoice.ilike.${like(search)},customer.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingSalesBill[];
    },
  });
}

export function useBillingPayments(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "payments", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingPayment[]> => {
      let query = (
        allBranches ? supabase.from("billing_payments") : supabase.from("billing_payments_branches")
      ).select("receipt, date, customer, invoice, amount, mode, status");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`receipt.ilike.${like(search)},customer.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingPayment[];
    },
  });
}

export function useBillingRefunds(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["billing", "refunds", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<BillingRefund[]> => {
      let query = (
        allBranches ? supabase.from("billing_refunds") : supabase.from("billing_refunds_branches")
      ).select("refund, invoice, customer, amount, reason, status");
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
      const billDate = input.bill_date ?? Date().toString().slice(0, 10);
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
