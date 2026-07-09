import type { ProductStatus } from "@/types/inventory";

export function calculateProductStatus(stock: number, minStock: number): ProductStatus {
  if (stock === 0) return "Out of Stock";
  if (stock < minStock) return "Low Stock";
  return "In Stock";
}
