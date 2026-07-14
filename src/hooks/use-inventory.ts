import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchLowStockAlerts } from "@/lib/inventory-utils";
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
  return useQuery({
    queryKey: ["inventory", "products", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Product[]> => {
      // The products table is the single source of truth for the catalogue and
      // has no branch dimension, so every branch sees the same list (the old
      // products_branches twin was empty and is being retired).
      let query = supabase
        .from("products")
        .select("sku, name, category, price, stock, minStock:min_stock, status");
      if (search) query = query.or(`name.ilike.${like(search)},sku.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching products from Supabase:", error);
        throw error;
      }
      // The SKU IS the barcode (one identifier) — see generateSku() in
      // @/lib/inventory-utils, called when a product is created.
      return (data as Omit<Product, "barcode">[]).map((p) => ({ ...p, barcode: p.sku }));
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
  return useQuery({
    queryKey: ["inventory", "low-stock-alerts", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<LowStockAlert[]> => {
      // Derived live from the products table (single source of truth) instead of
      // the standalone low_stock_alerts table, so an alert can never disagree
      // with the product it is about. products has no branch dimension, so the
      // list is global regardless of the selected branch.
      const alerts = await fetchLowStockAlerts();
      if (!search) return alerts;
      const q = search.toLowerCase();
      return alerts.filter(
        (a) => a.product.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q),
      );
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
    mutationFn: async (input: InventoryReport & { branch?: string }): Promise<InventoryReport> => {
      const row = {
        report: input.report,
        period: input.period,
        generated: input.generated,
        format: input.format,
      };
      const { error } = await supabase.from("inventory_reports").insert(row);
      if (error) throw error;
      const branch = input.branch && input.branch !== "all" ? input.branch : null;
      if (branch) {
        const { error: branchError } = await supabase
          .from("inventory_reports_branches")
          .insert({ ...row, branch });
        if (branchError) throw branchError;
      }
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

// Branch-scoped sessions pin every page to one branch. Their writes go to BOTH
// the global table (the super admin "All Branches" view) and the `_branches`
// junction row (their own branch view) — pass the pinned branch to opt in.
function realBranch(branch?: string): string | null {
  return branch && branch !== "all" ? branch : null;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput & { branch?: string }): Promise<CategoryInput> => {
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
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase.from("category_branches").insert({
          category: input.name,
          branch,
          product_count: 0,
          stock_value: "₹0",
          last_updated: "Just now",
        });
        if (branchError) throw branchError;
      }
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
    // From a pinned branch view, delete removes the category from that branch
    // only (its junction row); the global entity delete stays the "All
    // Branches" behavior and cascades every branch row away.
    mutationFn: async (input: { name: string; branch?: string }): Promise<string> => {
      const branch = realBranch(input.branch);
      if (branch) {
        const { error } = await supabase
          .from("category_branches")
          .delete()
          .eq("category", input.name)
          .eq("branch", branch);
        if (error) throw error;
        return input.name;
      }
      const { error } = await supabase.from("categories").delete().eq("name", input.name);
      if (error) throw error;
      return input.name;
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
    mutationFn: async (input: StockInwardInput & { branch?: string }) => {
      const { error } = await supabase.from("stock_inward").insert(inwardRow(input));
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_inward_branches")
          .insert({ ...inwardRow(input), branch });
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateStockInward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockInwardInput & { originalGrn: string; branch?: string }) => {
      const { error } = await supabase
        .from("stock_inward")
        .update(inwardRow(input))
        .eq("grn", input.originalGrn);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_inward_branches")
          .update({ ...inwardRow(input), branch })
          .eq("grn", input.originalGrn)
          .eq("branch", branch);
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteStockInward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { grn: string; branch?: string }) => {
      const { error } = await supabase.from("stock_inward").delete().eq("grn", input.grn);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_inward_branches")
          .delete()
          .eq("grn", input.grn)
          .eq("branch", branch);
        if (branchError) throw branchError;
      }
      return input.grn;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

function outwardRow(input: StockOutwardInput) {
  return {
    ref: input.ref,
    date: input.date,
    product: input.product,
    type: input.type,
    qty: input.qty,
    reference: input.reference,
    by: input.by,
  };
}

export function useCreateStockOutward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockOutwardInput & { branch?: string }) => {
      const { error } = await supabase.from("stock_outward").insert(outwardRow(input));
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_outward_branches")
          .insert({ ...outwardRow(input), branch });
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateStockOutward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockOutwardInput & { originalRef: string; branch?: string }) => {
      const { error } = await supabase
        .from("stock_outward")
        .update(outwardRow(input))
        .eq("ref", input.originalRef);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_outward_branches")
          .update({ ...outwardRow(input), branch })
          .eq("ref", input.originalRef)
          .eq("branch", branch);
        if (branchError) throw branchError;
      }
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteStockOutward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ref: string; branch?: string }) => {
      const { error } = await supabase.from("stock_outward").delete().eq("ref", input.ref);
      if (error) throw error;
      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_outward_branches")
          .delete()
          .eq("ref", input.ref)
          .eq("branch", branch);
        if (branchError) throw branchError;
      }
      return input.ref;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

// Low-stock alerts are now derived from products (see useLowStockAlerts /
// fetchLowStockAlerts), so there is nothing to create/update/delete — an alert
// appears and clears automatically as a product's stock crosses min_stock.

export function useSubmitStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: StockAdjustmentInput & { branch?: string },
    ): Promise<StockAdjustmentInput> => {
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

      const historyRow = {
        datetime: input.date,
        product: input.sku,
        change: input.adjustedStock,
        type: "Adjustment",
        balance: input.adjustedStock,
        by: "Admin",
      };
      const { error: historyError } = await supabase.from("stock_history").insert(historyRow);
      if (historyError) throw historyError;

      const branch = realBranch(input.branch);
      if (branch) {
        const { error: branchError } = await supabase
          .from("stock_history_branches")
          .insert({ ...historyRow, branch });
        if (branchError) throw branchError;
      }

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
