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
  return useQuery({
    queryKey: ["pos", "products", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<PosProduct[]> => {
      // Product catalogue reads from the canonical products table (single source
      // of truth) instead of the standalone pos_products cache, which had drifted
      // (stale stock/price/name). products has no branch dimension, so the list
      // is global regardless of the selected branch.
      let query = supabase.from("products").select("sku, name, category, price, stock");
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      // The SKU IS the barcode (one identifier, no separate column/migration
      // needed) — see generateSku() in @/lib/inventory-utils.
      return (data as Omit<PosProduct, "barcode">[]).map((p) => ({ ...p, barcode: p.sku }));
    },
  });
}

const BASE_TXN_COLS = "time, invoice, items, amount, payment, cashier, status";
const FULL_TXN_COLS =
  `${BASE_TXN_COLS}, subtotal, discount, gst, total, upiRef:upi_ref, ` +
  "customerName:customer_name, customerMobile:customer_mobile, customerDob:customer_dob, " +
  "customerGstin:customer_gstin, invoiceDate:invoice_date, couponCode:coupon_code";

export function usePosTransactions(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["pos", "transactions", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<PosTransaction[]> => {
      function buildQuery(cols: string) {
        let q = (
          allBranches
            ? supabase.from("pos_transactions")
            : supabase.from("pos_transactions_branches")
        ).select(cols);
        // Latest transaction first. The global table has created_at; the branch
        // table doesn't, so fall back to the (monotonic) invoice number there.
        if (allBranches) q = q.order("created_at", { ascending: false });
        else q = q.eq("branch", branch).order("invoice", { ascending: false });
        if (search) q = q.or(`invoice.ilike.${like(search)},cashier.ilike.${like(search)}`);
        return q;
      }

      // The money-breakdown columns (added for itemized receipts) may not
      // exist yet if supabase/pos/06_transaction_items.sql hasn't been run —
      // fall back to the base columns so the page still loads.
      const { data, error } = await buildQuery(allBranches ? FULL_TXN_COLS : BASE_TXN_COLS);
      if (!error) return data as unknown as PosTransaction[];

      const { data: fallbackData, error: fallbackError } = await buildQuery(BASE_TXN_COLS);
      if (fallbackError) throw fallbackError;
      return fallbackData as unknown as PosTransaction[];
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

const BASE_TXN_ROW = (input: PosTransactionInput) => ({
  invoice: input.invoice,
  time: input.time,
  items: input.items,
  amount: input.amount,
  payment: input.payment,
  cashier: input.cashier,
  status: input.status,
});

export function useCreatePosTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PosTransactionInput): Promise<PosTransaction> => {
      // Try the full shape (money breakdown columns) first; if
      // supabase/pos/06_transaction_items.sql hasn't been run yet, those
      // columns won't exist — fall back to the base row so checkout still
      // completes instead of failing outright.
      const { error } = await supabase.from("pos_transactions").insert({
        ...BASE_TXN_ROW(input),
        subtotal: input.subtotal ?? null,
        discount: input.discount ?? null,
        gst: input.gst ?? null,
        total: input.total ?? null,
        upi_ref: input.upiRef ?? null,
        customer_name: input.customerName ?? null,
        customer_mobile: input.customerMobile ?? null,
        customer_dob: input.customerDob ?? null,
        customer_gstin: input.customerGstin ?? null,
        invoice_date: input.invoiceDate ?? null,
        coupon_code: input.couponCode ?? null,
      });
      if (error) {
        const { error: fallbackError } = await supabase
          .from("pos_transactions")
          .insert(BASE_TXN_ROW(input));
        if (fallbackError) throw fallbackError;
      }

      if (input.lines && input.lines.length > 0) {
        // Same story for the line-items table — best-effort, never blocks checkout.
        await supabase.from("pos_transaction_items").insert(
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
