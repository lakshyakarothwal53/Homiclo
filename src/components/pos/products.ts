export type Product = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

// Catalogue rows come from Supabase via `usePosProducts()` in src/hooks/use-pos.ts.

export const formatINR = (value: number) => `₹${value.toLocaleString("en-IN")}`;
