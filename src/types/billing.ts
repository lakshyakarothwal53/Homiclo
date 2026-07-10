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
  bill_date?: string;
  amount_num?: number;
};

export type BillingPayment = {
  date: string;
  receipt: string;
  customer: string;
  invoice: string;
  amount: string;
  mode: string;
  status: string;
  pay_date?: string;
};

export type BillingRefund = {
  refund: string;
  invoice: string;
  customer: string;
  amount: string;
  reason: string;
  status: string;
  refund_date?: string;
  amount_num?: number;
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

export type BillingReport = {
  report: string;
  period: string;
  generated: string;
  format: string;
};
