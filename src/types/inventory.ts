export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type StockOutwardType = "Sale" | "Damage" | "Transfer";
export type StockHistoryType = "Sale" | "Inward" | "Adjustment" | "Transfer";
export type LowStockStatus = "Critical" | "Low";
export type ReportFormat = "PDF" | "Excel";
export type AdjustmentReason = "Damage" | "Audit Correction" | "Theft" | "Return" | "Other";

export interface Product {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
}

export interface Category {
  name: string;
  productCount: number;
  stockValue: string;
  lastUpdated: string;
}

export interface StockInwardEntry {
  date: string;
  grn: string;
  product: string;
  supplier: string;
  qty: number;
  cost: string;
  receivedBy: string;
}

export interface StockOutwardEntry {
  date: string;
  ref: string;
  product: string;
  type: StockOutwardType;
  qty: number;
  reference: string;
  by: string;
}

export interface StockHistoryEntry {
  datetime: string;
  product: string;
  change: number;
  type: StockHistoryType;
  balance: number;
  by: string;
}

export interface LowStockAlert {
  sku: string;
  product: string;
  currentStock: number;
  minLevel: number;
  status: LowStockStatus;
}

export interface InventoryReport {
  report: string;
  period: string;
  generated: string;
  format: ReportFormat;
}

export interface StockMovementPoint {
  d: string;
  inward: number;
  outward: number;
}

export interface TopCategory {
  name: string;
  productCount: number;
  share: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalCategories: number;
  stockValue: string;
  lowStock: number;
  outOfStock: number;
}

export interface InventoryDashboard {
  stats: InventoryStats;
  stockMovement: StockMovementPoint[];
  topCategories: TopCategory[];
}

export interface StockAdjustmentInput {
  sku: string;
  adjustedStock: number;
  reason: AdjustmentReason;
  date: string;
  notes?: string;
}
