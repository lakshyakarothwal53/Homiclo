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
      if (error) {
        console.error("Supabase error fetching dashboard:", error);
        throw error;
      }
      console.log("Dashboard data from Supabase:", data);
      return data.data as InventoryDashboard;
    },
  });
}

export function useProducts(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "products", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Product[]> => {
      let query = allBranches
        ? supabase
            .from("products")
            .select("sku, barcode, name, category, price, stock, minStock:min_stock, status")
        : supabase
            .from("products_branches")
            .select("sku, name, category, price, stock, minStock:min_stock, status");
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching products from Supabase:", error);
        throw error;
      }
      console.log("Products loaded from Supabase:", data);
      return data as Product[];
    },
  });
}

function formatStockValue(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

export function useCategories(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["inventory", "categories", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Category[]> => {
      if (allBranches) {
        // categories.product_count/stock_value are seed-time snapshots that
        // drift the moment products are added/edited/deleted — compute both
        // live from the products table instead of trusting the stored columns.
        let query = supabase.from("categories").select("name, last_updated:last_updated");
        if (search) query = query.ilike("name", like(search));
        const { data: cats, error } = await query;
        if (error) throw error;

        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("category, price, stock");
        if (prodError) throw prodError;

        const live: Record<string, { count: number; value: number }> = {};
        (products ?? []).forEach((p) => {
          const cat = (p.category && p.category.trim()) || "Uncategorized";
          if (!live[cat]) live[cat] = { count: 0, value: 0 };
          live[cat].count += 1;
          live[cat].value += (p.price ?? 0) * (p.stock ?? 0);
        });

        return (cats ?? []).map((c) => {
          const agg = live[c.name] ?? { count: 0, value: 0 };
          return {
            name: c.name,
            productCount: agg.count,
            stockValue: formatStockValue(agg.value),
            lastUpdated: c.last_updated,
          };
        });
      }

      // No live products_branches data exists yet to aggregate from, so the
      // branch-scoped path keeps reading the per-branch junction table.
      let query = supabase
        .from("category_branches")
        .select(
          "name:category, productCount:product_count, stockValue:stock_value, lastUpdated:last_updated",
        )
        .eq("branch", branch);
      if (search) query = query.ilike("category", like(search));
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching category branches from Supabase:", error);
        throw error;
      }
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
      if (error) {
        console.error("Error fetching stock inward from Supabase:", error);
        throw error;
      }
      console.log("Stock Inward loaded from Supabase:", data);
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
      if (error) {
        console.error("Error fetching stock outward from Supabase:", error);
        throw error;
      }
      console.log("Stock Outward loaded from Supabase:", data);
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
      if (error) {
        console.error("Error fetching low stock alerts from Supabase:", error);
        throw error;
      }
      console.log("Low Stock Alerts loaded from Supabase:", data);
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

export function useCreateInventoryReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InventoryReport): Promise<InventoryReport> => {
      const { error } = await supabase.from("inventory_reports").insert({
        report: input.report,
        period: input.period,
        generated: input.generated,
        format: input.format,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "reports"] });
    },
  });
}

export type CategoryInput = {
  name: string;
};

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput): Promise<CategoryInput> => {
      // product_count/stock_value are no longer read (useCategories computes
      // them live from products) but the columns are still not-null, so seed
      // zero values for a freshly created, still-empty category.
      const { error } = await supabase.from("categories").insert({
        name: input.name,
        product_count: 0,
        stock_value: "₹0",
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
        .update({ name: input.name, last_updated: "Just now" })
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
      const row = {
        sku: input.sku,
        name: input.name,
        category: input.category,
        price: input.price,
        stock: input.stock,
        min_stock: input.minStock ?? 10,
        status: input.status,
      };
      const { error } = await supabase.from("products").insert(row);
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
      const { originalSku, ...product } = input;
      const row = {
        sku: product.sku,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        min_stock: product.minStock ?? 10,
        status: product.status,
      };
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

export type AddToStockInput = {
  sku: string;
  addStock: number;
};

export function useAddToStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddToStockInput) => {
      const { data: current, error: fetchError } = await supabase
        .from("products")
        .select("stock")
        .eq("sku", input.sku)
        .single();

      if (fetchError) throw fetchError;
      if (!current) throw new Error("Product not found");

      const newStock = (current.stock || 0) + input.addStock;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("sku", input.sku);

      if (updateError) throw updateError;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
