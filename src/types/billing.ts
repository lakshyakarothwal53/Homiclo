export type BillingDashboard = {
  todayRevenue: string;
  todayRevenueHint: string;
  pendingPayments: string;
  pendingPaymentsHint: string;
  thisMonth: string;
  thisMonthDelta: string;
  refunds: string;
  refundsHint: string;
  tallySyncedToday: string;
  tallySyncedHint: string;
  tallyPendingSync: string;
  tallyPendingHint: string;
  tallyFailed: string;
  tallyFailedHint: string;
};

export type BillingRevenueTrend = {
  d: string;
  revenue: number;
};

export type BillingSalesBill = {
  invoice: string;
  date: string;
  customer: string;
  amount: string;
  payment: string;
  status: string;
};

export type BillingPayment = {
  date: string;
  receipt: string;
  customer: string;
  invoice: string;
  amount: string;
  mode: string;
  status: string;
};

export type BillingRefund = {
  refund: string;
  invoice: string;
  customer: string;
  amount: string;
  reason: string;
  status: string;
};

export type BillingTaxInvoice = {
  invoice: string;
  date: string;
  gstin: string;
  taxable: string;
  cgst: string;
  sgst: string;
  total: string;
};

export type BillingTallyRow = {
  time: string;
  voucher: string;
  reference: string;
  amount: string;
  status: string;
};

export type BillingGatewayTxn = {
  txn: string;
  date: string;
  customer: string;
  amount: string;
  gateway: string;
  status: string;
};

export type BillingReport = {
  report: string;
  period: string;
  generated: string;
  format: string;
};
