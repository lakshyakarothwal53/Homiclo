import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PosProduct, PosTransaction, PosTransactionInput } from "@/types/pos";

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
      ).select("sku, name, category, price, stock");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
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
      let query = (
        allBranches ? supabase.from("pos_transactions") : supabase.from("pos_transactions_branches")
      ).select("time, invoice, items, amount, payment, cashier, status");
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

export function useCreatePosProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PosProduct): Promise<PosProduct> => {
      const { error } = await supabase.from("pos_products").insert({
        sku: input.sku,
        name: input.name,
        category: input.category,
        price: input.price,
        stock: input.stock,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos"] });
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
