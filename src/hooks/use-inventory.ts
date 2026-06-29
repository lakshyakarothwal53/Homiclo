import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  Category,
  InventoryDashboard,
  InventoryReport,
  LowStockAlert,
  Product,
  StockAdjustmentInput,
  StockHistoryEntry,
  StockInwardEntry,
  StockOutwardEntry,
} from "@/types/inventory";

// All data flows through these hooks. Each queryFn reads from Supabase; columns
// are stored snake_case and aliased back to the camelCase shape the types in
// @/types/inventory expect (e.g. received_by:receivedBy). Components never change.

function like(value: string) {
  return `%${value}%`;
}

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ["inventory", "dashboard"],
    queryFn: async (): Promise<InventoryDashboard> => {
      const { data, error } = await supabase.from("inventory_dashboard").select("data").single();
      if (error) throw error;
      return data.data as InventoryDashboard;
    },
  });
}

export function useProducts(search?: string) {
  return useQuery({
    queryKey: ["inventory", "products", search ?? ""],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from("products").select("sku, name, category, price, stock, status");
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useCategories(search?: string) {
  return useQuery({
    queryKey: ["inventory", "categories", search ?? ""],
    queryFn: async (): Promise<Category[]> => {
      let query = supabase
        .from("categories")
        .select(
          "name, productCount:product_count, stockValue:stock_value, lastUpdated:last_updated",
        );
      if (search) query = query.ilike("name", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Category[];
    },
  });
}

export function useStockInward(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-inward", search ?? ""],
    queryFn: async (): Promise<StockInwardEntry[]> => {
      let query = supabase
        .from("stock_inward")
        .select("date, grn, product, supplier, qty, cost, receivedBy:received_by");
      if (search) query = query.or(`product.ilike.${like(search)},grn.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockInwardEntry[];
    },
  });
}

export function useStockOutward(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-outward", search ?? ""],
    queryFn: async (): Promise<StockOutwardEntry[]> => {
      let query = supabase
        .from("stock_outward")
        .select("date, ref, product, type, qty, reference, by");
      if (search) query = query.or(`product.ilike.${like(search)},ref.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockOutwardEntry[];
    },
  });
}

export function useStockHistory(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-history", search ?? ""],
    queryFn: async (): Promise<StockHistoryEntry[]> => {
      let query = supabase
        .from("stock_history")
        .select("datetime, product, change, type, balance, by");
      if (search) query = query.ilike("product", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockHistoryEntry[];
    },
  });
}

export function useLowStockAlerts(search?: string) {
  return useQuery({
    queryKey: ["inventory", "low-stock-alerts", search ?? ""],
    queryFn: async (): Promise<LowStockAlert[]> => {
      let query = supabase
        .from("low_stock_alerts")
        .select("sku, product, currentStock:current_stock, minLevel:min_level, status");
      if (search) query = query.or(`product.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as LowStockAlert[];
    },
  });
}

export function useInventoryReports(search?: string) {
  return useQuery({
    queryKey: ["inventory", "reports", search ?? ""],
    queryFn: async (): Promise<InventoryReport[]> => {
      let query = supabase.from("inventory_reports").select("report, period, generated, format");
      if (search) query = query.ilike("report", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryReport[];
    },
  });
}

export function useSubmitStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockAdjustmentInput): Promise<StockAdjustmentInput> => {
      const { error: adjError } = await supabase.from("stock_adjustments").insert({
        sku: input.sku,
        adjusted_stock: input.adjustedStock,
        reason: input.reason,
        date: input.date,
        notes: input.notes,
      });
      if (adjError) throw adjError;

      const { error: prodError } = await supabase
        .from("products")
        .update({ stock: input.adjustedStock })
        .eq("sku", input.sku);
      if (prodError) throw prodError;

      const { error: historyError } = await supabase.from("stock_history").insert({
        datetime: input.date,
        product: input.sku,
        change: input.adjustedStock,
        type: "Adjustment",
        balance: input.adjustedStock,
        by: "Admin",
      });
      if (historyError) throw historyError;

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
