import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAppSetting, useSaveAppSetting } from "@/hooks/use-settings";
import {
  DEFAULT_POS_SETTINGS,
  type PosLineItem,
  type PosProduct,
  type PosSettings,
  type PosTransaction,
  type PosTransactionInput,
} from "@/types/pos";

export function usePosSettings() {
  const query = useAppSetting<Partial<PosSettings>>("pos");
  const settings: PosSettings = { ...DEFAULT_POS_SETTINGS, ...(query.data ?? {}) };
  return { ...query, settings };
}

export function useSavePosSettings() {
  return useSaveAppSetting<PosSettings>("pos");
}

function like(value: string) {
  return `%${value}%`;
}

export function usePosProducts(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["pos", "products", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<PosProduct[]> => {
      let query = (
        allBranches ? supabase.from("pos_products") : supabase.from("pos_products_branches")
      ).select("sku, barcode, name, category, price, stock");
      if (!allBranches) query = query.eq("branch", branch);
      if (search)
        query = query.or(
          `name.ilike.${like(search)},sku.ilike.${like(search)},barcode.ilike.${like(search)}`,
        );
      const { data, error } = await query;
      if (error) throw error;
      return data as PosProduct[];
    },
  });
}

export function usePosTransactions(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["pos", "transactions", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<PosTransaction[]> => {
      let query = allBranches
        ? supabase
            .from("pos_transactions")
            .select(
              "time, invoice, items, amount, payment, cashier, status, subtotal, discount, gst, total, upiRef:upi_ref",
            )
        : supabase
            .from("pos_transactions_branches")
            .select("time, invoice, items, amount, payment, cashier, status");
      if (allBranches) query = query.order("created_at", { ascending: false });
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`invoice.ilike.${like(search)},cashier.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as PosTransaction[];
    },
  });
}

export function usePosBranches() {
  return useQuery({
    queryKey: ["pos", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}

export function useNextPosInvoiceNumber() {
  return useQuery({
    queryKey: ["pos", "next-invoice-number"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("pos_transactions")
        .select("invoice")
        .order("invoice", { ascending: false })
        .limit(1);
      if (error) throw error;
      const lastNum = data?.[0]?.invoice ? parseInt(data[0].invoice.replace(/\D/g, ""), 10) : 10248;
      return `INV-${lastNum + 1}`;
    },
  });
}

export function useCreatePosTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PosTransactionInput): Promise<PosTransaction> => {
      const { error } = await supabase.from("pos_transactions").insert({
        invoice: input.invoice,
        time: input.time,
        items: input.items,
        amount: input.amount,
        payment: input.payment,
        cashier: input.cashier,
        status: input.status,
        subtotal: input.subtotal ?? null,
        discount: input.discount ?? null,
        gst: input.gst ?? null,
        total: input.total ?? null,
        upi_ref: input.upiRef ?? null,
      });
      if (error) throw error;

      if (input.lines && input.lines.length > 0) {
        const { error: itemsError } = await supabase.from("pos_transaction_items").insert(
          input.lines.map((l) => ({
            invoice: input.invoice,
            barcode: l.barcode,
            sku: l.sku,
            name: l.name,
            qty: l.qty,
            unit_price: l.unitPrice,
            line_total: l.lineTotal,
          })),
        );
        if (itemsError) throw itemsError;
      }
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos"] });
    },
  });
}

export type UpiQr = { qrId: string; imageUrl: string };

/** Create a dynamic UPI QR for a bill amount (calls the pos-upi-qr Edge Function). */
export async function createUpiQr(amount: number, invoice: string): Promise<UpiQr> {
  const { data, error } = await supabase.functions.invoke("pos-upi-qr", {
    body: { action: "create", amount, invoice },
  });
  if (error || data?.error) {
    throw new Error(
      data?.error ??
        "UPI QR function not reachable. Deploy supabase/functions/pos-upi-qr (see its README) and set Razorpay secrets.",
    );
  }
  return { qrId: data.qrId, imageUrl: data.imageUrl };
}

/** Poll payment status for a UPI QR. Returns { paid, paymentRef }. */
export async function checkUpiStatus(
  qrId: string,
): Promise<{ paid: boolean; paymentRef?: string }> {
  const { data, error } = await supabase.functions.invoke("pos-upi-qr", {
    body: { action: "status", qrId },
  });
  if (error || data?.error) throw new Error(data?.error ?? "Could not check payment status.");
  return { paid: !!data.paid, paymentRef: data.paymentRef };
}

/** Fetch a transaction's saved line items on demand (used for reprint). */
export async function fetchPosTransactionItems(invoice: string): Promise<PosLineItem[]> {
  const { data, error } = await supabase
    .from("pos_transaction_items")
    .select("barcode, sku, name, qty, unitPrice:unit_price, lineTotal:line_total")
    .eq("invoice", invoice);
  if (error) throw error;
  return (data ?? []) as PosLineItem[];
}

export function usePosTransactionItems(invoice: string | undefined) {
  return useQuery({
    queryKey: ["pos", "transaction-items", invoice ?? ""],
    enabled: !!invoice,
    queryFn: async (): Promise<PosLineItem[]> => {
      const { data, error } = await supabase
        .from("pos_transaction_items")
        .select("barcode, sku, name, qty, unitPrice:unit_price, lineTotal:line_total")
        .eq("invoice", invoice);
      if (error) throw error;
      return data as PosLineItem[];
    },
  });
}
