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

export function validateImportRow(
  row: Record<string, string>,
  rowNumber: number,
): { valid: true; product: Product } | { valid: false; error: string } {
  const sku = row.sku?.trim();
  const name = row.product?.trim();
  const category = row.category?.trim();
  const price = Number(row["price (₹)"] || row.price || 0);
  const stock = Number(row.stock || 0);
  const minStock = Number(row["minimum stock"] || row["min stock"] || 10);

  // Validate required fields
  if (!sku) {
    return { valid: false, error: "SKU is required" };
  }

  if (!name) {
    return { valid: false, error: "Product name is required" };
  }

  if (!category) {
    return { valid: false, error: "Category is required" };
  }

  if (price < 0) {
    return { valid: false, error: "Price must be a valid positive number" };
  }

  if (stock < 0) {
    return { valid: false, error: "Stock must be a valid non-negative number" };
  }

  if (minStock < 0) {
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
      stock,
      minStock,
      status,
    },
  };
}
