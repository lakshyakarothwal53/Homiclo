import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";

export const Route = createFileRoute("/_app/billing/payments")({
  head: () => ({
    meta: [
      { title: "Payment Collection — HOMIQLO" },
      { name: "description", content: "Collected payments and pending dues." },
    ],
  }),
  component: Page,
});

type Payment = {
  date: string;
  receipt: string;
  customer: string;
  invoice: string;
  amount: string;
  mode: string;
  status: string;
};

const payments: Payment[] = [
  {
    date: "12 Nov",
    receipt: "REC-4521",
    customer: "Anita Desai",
    invoice: "INV-10248",
    amount: "₹4,616",
    mode: "UPI",
    status: "Received",
  },
  {
    date: "12 Nov",
    receipt: "REC-4520",
    customer: "Walk-in",
    invoice: "INV-10247",
    amount: "₹1,820",
    mode: "Cash",
    status: "Received",
  },
  {
    date: "11 Nov",
    receipt: "REC-4519",
    customer: "Sneha Iyer",
    invoice: "INV-10245",
    amount: "₹2,950",
    mode: "UPI",
    status: "Received",
  },
  {
    date: "10 Nov",
    receipt: "REC-4518",
    customer: "Vikram Joshi",
    invoice: "INV-10240",
    amount: "₹8,200",
    mode: "NEFT",
    status: "Received",
  },
];

const columns: Column<Payment>[] = [
  {
    key: "date",
    header: "Date",
    render: (r) => <span className="text-muted-foreground">{r.date}</span>,
  },
  {
    key: "receipt",
    header: "Receipt",
    render: (r) => <span className="font-mono text-xs">{r.receipt}</span>,
  },
  { key: "customer", header: "Customer" },
  {
    key: "invoice",
    header: "Invoice",
    render: (r) => <span className="font-mono text-xs">{r.invoice}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    render: (r) => <span className="font-medium">{r.amount}</span>,
  },
  {
    key: "mode",
    header: "Mode",
    render: (r) => <span className="text-muted-foreground">{r.mode}</span>,
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Billing › Payments"
        title="Payment Collection"
        description="Payments overview and controls."
      />
      <FilterBar searchPlaceholder="Search receipts..." />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={payments} rowKey={(r) => r.receipt} />
        <EntriesFooter shown={4} total={4} />
      </Card>
    </>
  );
}
