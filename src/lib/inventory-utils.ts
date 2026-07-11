import { supabase } from "@/lib/supabase";
import type { LowStockAlert, LowStockStatus, ProductStatus } from "@/types/inventory";

export function calculateProductStatus(stock: number, minStock: number): ProductStatus {
  if (stock === 0) return "Out of Stock";
  if (stock < minStock) return "Low Stock";
  return "In Stock";
}

// A low-stock alert is a *derived* fact, not a stored record: any product whose
// on-hand stock has dropped below its own min_stock threshold. Critical once it
// is at or under half that threshold (matches the original seed data:
// stock 0 and stock 3/min 10 were both "Critical").
export function deriveLowStockStatus(stock: number, minStock: number): LowStockStatus {
  return stock <= Math.floor(minStock / 2) ? "Critical" : "Low";
}

// Single source of truth for low-stock alerts: computed live from the products
// table so they can never drift from the actual product record. Replaces the
// standalone low_stock_alerts table, whose stored rows had already gone stale
// (they listed SKUs whose stock was above min_stock). Callers that need fewer
// columns / a different shape map over this result.
export async function fetchLowStockAlerts(): Promise<LowStockAlert[]> {
  const { data, error } = await supabase
    .from("products")
    .select("sku, name, stock, min_stock")
    .order("stock");
  if (error) throw error;
  return (data ?? [])
    .map((p) => ({
      sku: p.sku as string,
      product: p.name as string,
      currentStock: (p.stock ?? 0) as number,
      minLevel: (p.min_stock ?? 0) as number,
    }))
    .filter((p) => p.currentStock < p.minLevel)
    .map((p) => ({ ...p, status: deriveLowStockStatus(p.currentStock, p.minLevel) }));
}

/**
 * Auto-generated unique product identifier — this SAME string is used as both
 * the SKU and the scannable barcode value (CODE128 encodes it verbatim), so a
 * product has exactly one code instead of two different numbers. Uniqueness
 * comes from the millisecond timestamp + a random suffix; the DB's `sku`
 * primary key is the final safety net against collisions.
 */
export function generateSku(): string {
  const rand = Math.floor(100 + Math.random() * 900);
  return `SKU${Date.now().toString(36).toUpperCase()}${rand}`;
}
