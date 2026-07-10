export type PosProduct = {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

export type PosTransaction = {
  time: string;
  invoice: string;
  items: number;
  amount: string;
  payment: string;
  cashier: string;
  status: string;
  subtotal?: number;
  discount?: number;
  gst?: number;
  total?: number;
  upiRef?: string;
};

export type PosLineItem = {
  barcode: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosTransactionInput = PosTransaction & {
  subtotal?: number;
  discount?: number;
  gst?: number;
  total?: number;
  upiRef?: string;
  lines?: PosLineItem[];
};

export type PosSettings = {
  gstRate: number; // percent, e.g. 18
  discountRate: number; // percent, e.g. 10
  receiptFooter: string;
  paperWidth: "80mm" | "58mm";
  autoPrint: boolean;
  storeName: string;
  storeAddress: string;
  gstin: string;
};

export const DEFAULT_POS_SETTINGS: PosSettings = {
  gstRate: 18,
  discountRate: 10,
  receiptFooter: "Thank you for shopping!",
  paperWidth: "80mm",
  autoPrint: true,
  storeName: "HOMIQLO",
  storeAddress: "",
  gstin: "",
};
