import type { ProductStatus } from "@/types/inventory";

export function calculateProductStatus(stock: number, minStock: number): ProductStatus {
  if (stock === 0) return "Out of Stock";
  if (stock < minStock) return "Low Stock";
  return "In Stock";
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
