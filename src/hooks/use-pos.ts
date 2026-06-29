import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PosProduct, PosTransaction, PosTransactionInput } from "@/types/pos";

function like(value: string) {
  return `%${value}%`;
}

export function usePosProducts(search?: string) {
  return useQuery({
    queryKey: ["pos", "products", search ?? ""],
    queryFn: async (): Promise<PosProduct[]> => {
      let query = supabase.from("pos_products").select("sku, name, category, price, stock");
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as PosProduct[];
    },
  });
}

export function usePosTransactions(search?: string) {
  return useQuery({
    queryKey: ["pos", "transactions", search ?? ""],
    queryFn: async (): Promise<PosTransaction[]> => {
      let query = supabase
        .from("pos_transactions")
        .select("time, invoice, items, amount, payment, cashier, status")
        .order("created_at", { ascending: false });
      if (search) query = query.or(`invoice.ilike.${like(search)},cashier.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as PosTransaction[];
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
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos"] });
    },
  });
}
