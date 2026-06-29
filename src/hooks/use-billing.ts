import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  BillingDashboard,
  BillingGatewayTxn,
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

export function useBillingDashboard() {
  return useQuery({
    queryKey: ["billing", "dashboard"],
    queryFn: async (): Promise<BillingDashboard> => {
      const { data, error } = await supabase.from("billing_dashboard").select("data").single();
      if (error) throw error;
      return data.data as BillingDashboard;
    },
  });
}

export function useBillingRevenueTrend() {
  return useQuery({
    queryKey: ["billing", "revenue-trend"],
    queryFn: async (): Promise<BillingRevenueTrend[]> => {
      const { data, error } = await supabase
        .from("billing_revenue_trend")
        .select("d, revenue")
        .order("sort_order");
      if (error) throw error;
      return data as BillingRevenueTrend[];
    },
  });
}

export function useBillingSalesBills(search?: string) {
  return useQuery({
    queryKey: ["billing", "sales-bills", search ?? ""],
    queryFn: async (): Promise<BillingSalesBill[]> => {
      let query = supabase
        .from("billing_sales_bills")
        .select("invoice, date, customer, amount, payment, status");
      if (search) query = query.or(`invoice.ilike.${like(search)},customer.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingSalesBill[];
    },
  });
}

export function useBillingPayments(search?: string) {
  return useQuery({
    queryKey: ["billing", "payments", search ?? ""],
    queryFn: async (): Promise<BillingPayment[]> => {
      let query = supabase
        .from("billing_payments")
        .select("receipt, date, customer, invoice, amount, mode, status");
      if (search) query = query.or(`receipt.ilike.${like(search)},customer.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingPayment[];
    },
  });
}

export function useBillingRefunds(search?: string) {
  return useQuery({
    queryKey: ["billing", "refunds", search ?? ""],
    queryFn: async (): Promise<BillingRefund[]> => {
      let query = supabase
        .from("billing_refunds")
        .select("refund, invoice, customer, amount, reason, status");
      if (search) query = query.or(`refund.ilike.${like(search)},customer.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingRefund[];
    },
  });
}

export function useBillingTaxInvoices(search?: string) {
  return useQuery({
    queryKey: ["billing", "tax-invoices", search ?? ""],
    queryFn: async (): Promise<BillingTaxInvoice[]> => {
      let query = supabase
        .from("billing_tax_invoices")
        .select("invoice, date, gstin, taxable, cgst, sgst, total");
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

export function useBillingGatewayTxns(search?: string) {
  return useQuery({
    queryKey: ["billing", "gateway-txns", search ?? ""],
    queryFn: async (): Promise<BillingGatewayTxn[]> => {
      let query = supabase
        .from("billing_gateway_txns")
        .select("txn, date, customer, amount, gateway, status");
      if (search) query = query.or(`txn.ilike.${like(search)},customer.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingGatewayTxn[];
    },
  });
}

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

export function useCreateBillingInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BillingSalesBill): Promise<BillingSalesBill> => {
      const { error } = await supabase.from("billing_sales_bills").insert({
        invoice: input.invoice,
        date: input.date,
        customer: input.customer,
        amount: input.amount,
        payment: input.payment,
        status: input.status,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
