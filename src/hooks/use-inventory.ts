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

export function useProducts(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "products", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Product[]> => {
      let query = (
        allBranches ? supabase.from("products") : supabase.from("products_branches")
      ).select("sku, name, category, price, stock, status");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useCategories(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "categories", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Category[]> => {
      if (allBranches) {
        let query = supabase
          .from("categories")
          .select(
            "name, productCount:product_count, stockValue:stock_value, lastUpdated:last_updated",
          );
        if (search) query = query.ilike("name", like(search));
        const { data, error } = await query;
        if (error) throw error;
        return data as unknown as Category[];
      }

      let query = supabase
        .from("category_branches")
        .select(
          "name:category, productCount:product_count, stockValue:stock_value, lastUpdated:last_updated",
        )
        .eq("branch", branch);
      if (search) query = query.ilike("category", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Category[];
    },
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ["inventory", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}

export function useStockInward(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "stock-inward", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<StockInwardEntry[]> => {
      let query = (
        allBranches ? supabase.from("stock_inward") : supabase.from("stock_inward_branches")
      ).select("date, grn, product, supplier, qty, cost, receivedBy:received_by");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`product.ilike.${like(search)},grn.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockInwardEntry[];
    },
  });
}

export function useStockOutward(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "stock-outward", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<StockOutwardEntry[]> => {
      let query = (
        allBranches ? supabase.from("stock_outward") : supabase.from("stock_outward_branches")
      ).select("date, ref, product, type, qty, reference, by");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`product.ilike.${like(search)},ref.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockOutwardEntry[];
    },
  });
}

export function useStockHistory(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "stock-history", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<StockHistoryEntry[]> => {
      let query = (
        allBranches ? supabase.from("stock_history") : supabase.from("stock_history_branches")
      ).select("datetime, product, change, type, balance, by");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.ilike("product", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockHistoryEntry[];
    },
  });
}

export function useLowStockAlerts(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "low-stock-alerts", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<LowStockAlert[]> => {
      let query = (
        allBranches ? supabase.from("low_stock_alerts") : supabase.from("low_stock_alerts_branches")
      ).select("sku, product, currentStock:current_stock, minLevel:min_level, status");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`product.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as LowStockAlert[];
    },
  });
}

export function useInventoryReports(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "reports", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<InventoryReport[]> => {
      let query = (
        allBranches
          ? supabase.from("inventory_reports")
          : supabase.from("inventory_reports_branches")
      ).select("report, period, generated, format");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.ilike("report", like(search));
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryReport[];
    },
  });
}

export type CategoryInput = {
  name: string;
  productCount: number;
  stockValue: string;
};

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput): Promise<CategoryInput> => {
      const { error } = await supabase.from("categories").insert({
        name: input.name,
        product_count: input.productCount,
        stock_value: input.stockValue,
        last_updated: "Just now",
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput & { originalName: string }): Promise<CategoryInput> => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: input.name,
          product_count: input.productCount,
          stock_value: input.stockValue,
          last_updated: "Just now",
        })
        .eq("name", input.originalName);
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      const { error } = await supabase.from("categories").delete().eq("name", name);
      if (error) throw error;
      return name;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// --- CRUD for the inventory list pages (global writes; see supabase/07_inventory_crud.sql) ---

export type ProductInput = Product;
export type StockInwardInput = StockInwardEntry;
export type StockOutwardInput = StockOutwardEntry;
export type LowStockAlertInput = LowStockAlert;

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const { error } = await supabase.from("products").insert(input);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput & { originalSku: string }) => {
      const { originalSku, ...row } = input;
      const { error } = await supabase.from("products").update(row).eq("sku", originalSku);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sku: string) => {
      const { error } = await supabase.from("products").delete().eq("sku", sku);
      if (error) throw error;
      return sku;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

function inwardRow(input: StockInwardInput) {
  return {
    grn: input.grn,
    date: input.date,
    product: input.product,
    supplier: input.supplier,
    qty: input.qty,
    cost: input.cost,
    received_by: input.receivedBy,
  };
}

export function useCreateStockInward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockInwardInput) => {
      const { error } = await supabase.from("stock_inward").insert(inwardRow(input));
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateStockInward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockInwardInput & { originalGrn: string }) => {
      const { error } = await supabase
        .from("stock_inward")
        .update(inwardRow(input))
        .eq("grn", input.originalGrn);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteStockInward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grn: string) => {
      const { error } = await supabase.from("stock_inward").delete().eq("grn", grn);
      if (error) throw error;
      return grn;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useCreateStockOutward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockOutwardInput) => {
      const { error } = await supabase.from("stock_outward").insert(input);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateStockOutward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockOutwardInput & { originalRef: string }) => {
      const { originalRef, ...row } = input;
      const { error } = await supabase.from("stock_outward").update(row).eq("ref", originalRef);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteStockOutward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ref: string) => {
      const { error } = await supabase.from("stock_outward").delete().eq("ref", ref);
      if (error) throw error;
      return ref;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

function alertRow(input: LowStockAlertInput) {
  return {
    sku: input.sku,
    product: input.product,
    current_stock: input.currentStock,
    min_level: input.minLevel,
    status: input.status,
  };
}

export function useCreateLowStockAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LowStockAlertInput) => {
      const { error } = await supabase.from("low_stock_alerts").insert(alertRow(input));
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateLowStockAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LowStockAlertInput & { originalSku: string }) => {
      const { error } = await supabase
        .from("low_stock_alerts")
        .update(alertRow(input))
        .eq("sku", input.originalSku);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteLowStockAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sku: string) => {
      const { error } = await supabase.from("low_stock_alerts").delete().eq("sku", sku);
      if (error) throw error;
      return sku;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
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
