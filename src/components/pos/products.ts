export type Product = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

// Mock catalogue — replace with a Supabase `use-products` query later.
export const PRODUCTS: Product[] = [
  { sku: "SKU-2401", name: "Cotton T-Shirt L", category: "Apparel", price: 599, stock: 124 },
  { sku: "SKU-2402", name: "Denim Jeans 32", category: "Apparel", price: 1299, stock: 42 },
  { sku: "SKU-2403", name: "Wireless Earbuds", category: "Electronics", price: 2499, stock: 8 },
  { sku: "SKU-2404", name: "Leather Wallet", category: "Accessories", price: 899, stock: 56 },
  { sku: "SKU-2405", name: "Basmati Rice 5kg", category: "Grocery", price: 650, stock: 210 },
  { sku: "SKU-2406", name: "Hair Dryer", category: "Electronics", price: 1899, stock: 17 },
  { sku: "SKU-2407", name: "Sports Cap", category: "Accessories", price: 399, stock: 88 },
  { sku: "SKU-2408", name: "Yoga Mat", category: "Fitness", price: 799, stock: 34 },
  { sku: "SKU-2409", name: "Notebook A5", category: "Stationery", price: 149, stock: 320 },
  { sku: "SKU-2410", name: "Water Bottle", category: "Lifestyle", price: 349, stock: 145 },
  { sku: "SKU-2411", name: "Phone Case", category: "Electronics", price: 299, stock: 76 },
  { sku: "SKU-2412", name: "Sunglasses", category: "Accessories", price: 1199, stock: 23 },
];

export const formatINR = (value: number) => `₹${value.toLocaleString("en-IN")}`;

// Auto-generated SKU used as the barcode value for new POS products —
// Code128 (used to render the printable barcode) encodes this alphanumeric
// string natively, so no separate numeric barcode field is needed.
export const generatePosSku = () => `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
