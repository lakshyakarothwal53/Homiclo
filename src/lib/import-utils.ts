import type { Product } from "@/types/inventory";

export type ImportResult = {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
};

export async function parseCSVFile(file: File): Promise<Array<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          reject(new Error("CSV file must have at least a header and one data row"));
          return;
        }

        const headers = parseCSVLine(lines[0]);
        const rows: Array<Record<string, string>> = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};

          headers.forEach((header, index) => {
            row[header.toLowerCase()] = values[index] || "";
          });

          rows.push(row);
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Every column from the export (see exportProductsToCSV) is required here —
// a row with ANY field blank is rejected outright rather than silently
// defaulted, so an incomplete catalogue entry never sneaks in through import.
export function validateImportRow(
  row: Record<string, string>,
  rowNumber: number,
): { valid: true; product: Product } | { valid: false; error: string } {
  const sku = row.sku?.trim();
  const name = row.product?.trim();
  const category = row.category?.trim();
  const priceRaw = (row["price (₹)"] || row.price || "").trim();
  const mrpRaw = (row["mrp (₹)"] || row.mrp || "").trim();
  const purchaseRateRaw = (row["purchase rate (₹)"] || row["purchase rate"] || "").trim();
  const gstRateRaw = (row["gst rate (%)"] || row["gst rate"] || "").trim();
  const stockRaw = (row.stock || "").trim();
  const minStockRaw = (row["minimum stock"] || row["min stock"] || "").trim();

  if (!sku) return { valid: false, error: "SKU is required" };
  if (!name) return { valid: false, error: "Product name is required" };
  if (!category) return { valid: false, error: "Category is required" };
  if (!priceRaw) return { valid: false, error: "Price is required" };
  if (!mrpRaw) return { valid: false, error: "MRP is required" };
  if (!purchaseRateRaw) return { valid: false, error: "Purchase Rate is required" };
  if (!gstRateRaw) return { valid: false, error: "GST Rate is required" };
  if (!stockRaw) return { valid: false, error: "Stock is required" };
  if (!minStockRaw) return { valid: false, error: "Minimum Stock is required" };

  const price = Number(priceRaw);
  const mrp = Number(mrpRaw);
  const purchaseRate = Number(purchaseRateRaw);
  const gstRate = Number(gstRateRaw);
  const stock = Number(stockRaw);
  const minStock = Number(minStockRaw);

  if (!Number.isFinite(price) || price < 0) {
    return { valid: false, error: "Price must be a valid non-negative number" };
  }
  if (!Number.isFinite(mrp) || mrp < 0) {
    return { valid: false, error: "MRP must be a valid non-negative number" };
  }
  if (!Number.isFinite(purchaseRate) || purchaseRate < 0) {
    return { valid: false, error: "Purchase Rate must be a valid non-negative number" };
  }
  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
    return { valid: false, error: "GST Rate must be a valid number between 0 and 100" };
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return { valid: false, error: "Stock must be a valid non-negative number" };
  }
  if (!Number.isFinite(minStock) || minStock < 0) {
    return { valid: false, error: "Minimum Stock must be a valid non-negative number" };
  }

  // Determine status based on stock and minStock
  let status: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
  if (stock === 0) {
    status = "Out of Stock";
  } else if (stock < minStock) {
    status = "Low Stock";
  }

  return {
    valid: true,
    product: {
      sku: sku.toUpperCase(),
      name,
      category,
      price,
      mrp,
      purchaseRate,
      gstRate,
      stock,
      minStock,
      status,
    },
  };
}
