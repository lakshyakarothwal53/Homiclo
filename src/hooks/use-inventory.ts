import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import categoriesData from "@/data/inventory/categories.json";
import dashboardData from "@/data/inventory/dashboard.json";
import inwardData from "@/data/inventory/stock-inward.json";
import lowStockData from "@/data/inventory/low-stock-alerts.json";
import outwardData from "@/data/inventory/stock-outward.json";
import productsData from "@/data/inventory/products.json";
import reportsData from "@/data/inventory/inventory-reports.json";
import historyData from "@/data/inventory/stock-history.json";
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

// All data flows through these hooks. Each queryFn is the single source-of-truth
// seam: it returns mock JSON today. To move to Supabase later, replace only the
// block marked SUPABASE-SWAP with `supabase.from(...).select()` — no component changes.

function matches(haystack: string, search?: string) {
  return !search || haystack.toLowerCase().includes(search.toLowerCase());
}

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ["inventory", "dashboard"],
    queryFn: async (): Promise<InventoryDashboard> => {
      // SUPABASE-SWAP: aggregate from products/stock tables via RPC or views.
      return dashboardData as InventoryDashboard;
    },
  });
}

export function useProducts(search?: string) {
  return useQuery({
    queryKey: ["inventory", "products", search ?? ""],
    queryFn: async (): Promise<Product[]> => {
      // SUPABASE-SWAP: supabase.from('products').select().or(name.ilike,sku.ilike)
      const rows = productsData as Product[];
      return rows.filter((p) => matches(p.name, search) || matches(p.sku, search));
    },
  });
}

export function useCategories(search?: string) {
  return useQuery({
    queryKey: ["inventory", "categories", search ?? ""],
    queryFn: async (): Promise<Category[]> => {
      // SUPABASE-SWAP: supabase.from('categories').select()
      const rows = categoriesData as Category[];
      return rows.filter((c) => matches(c.name, search));
    },
  });
}

export function useStockInward(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-inward", search ?? ""],
    queryFn: async (): Promise<StockInwardEntry[]> => {
      // SUPABASE-SWAP: supabase.from('stock_inward').select()
      const rows = inwardData as StockInwardEntry[];
      return rows.filter((r) => matches(r.product, search) || matches(r.grn, search));
    },
  });
}

export function useStockOutward(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-outward", search ?? ""],
    queryFn: async (): Promise<StockOutwardEntry[]> => {
      // SUPABASE-SWAP: supabase.from('stock_outward').select()
      const rows = outwardData as StockOutwardEntry[];
      return rows.filter((r) => matches(r.product, search) || matches(r.ref, search));
    },
  });
}

export function useStockHistory(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-history", search ?? ""],
    queryFn: async (): Promise<StockHistoryEntry[]> => {
      // SUPABASE-SWAP: supabase.from('stock_history').select()
      const rows = historyData as StockHistoryEntry[];
      return rows.filter((r) => matches(r.product, search));
    },
  });
}

export function useLowStockAlerts(search?: string) {
  return useQuery({
    queryKey: ["inventory", "low-stock-alerts", search ?? ""],
    queryFn: async (): Promise<LowStockAlert[]> => {
      // SUPABASE-SWAP: supabase.from('products').select().lte('stock','min_level')
      const rows = lowStockData as LowStockAlert[];
      return rows.filter((r) => matches(r.product, search) || matches(r.sku, search));
    },
  });
}

export function useInventoryReports(search?: string) {
  return useQuery({
    queryKey: ["inventory", "reports", search ?? ""],
    queryFn: async (): Promise<InventoryReport[]> => {
      // SUPABASE-SWAP: supabase.from('inventory_reports').select()
      const rows = reportsData as InventoryReport[];
      return rows.filter((r) => matches(r.report, search));
    },
  });
}

export function useSubmitStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockAdjustmentInput): Promise<StockAdjustmentInput> => {
      // SUPABASE-SWAP: insert into stock_adjustments + update products.stock,
      // then insert a stock_history row.
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
