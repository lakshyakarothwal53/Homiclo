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
  customerName?: string;
  customerMobile?: string;
  customerDob?: string;
  customerGstin?: string;
  invoiceDate?: string;
  couponCode?: string;
};

// Buyer details captured on the "Collect Payment" step. Name, mobile, dob and
// invoiceDate are mandatory in the UI; gstin is optional.
export type PosCustomer = {
  name: string;
  mobile: string;
  dob: string;
  invoiceDate: string;
  gstin?: string;
};

// A coupon resolved from discount settings and applied to the cart total.
export type AppliedCoupon = {
  code: string;
  valueType: "percentage" | "flat";
  value: number;
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

export type PaymentResult = {
  paymentMode: string;
  upiRef?: string;
  customer: PosCustomer;
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
