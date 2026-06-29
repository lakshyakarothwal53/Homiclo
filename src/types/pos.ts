export type PosProduct = {
  sku: string;
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
};

export type PosTransactionInput = PosTransaction;
