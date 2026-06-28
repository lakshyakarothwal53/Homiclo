import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";

export const Route = createFileRoute("/_app/billing/gateway")({
  head: () => ({
    meta: [
      { title: "Payment Gateway — HOMIQLO" },
      { name: "description", content: "Online transactions and settlements." },
    ],
  }),
  component: Page,
});

type Txn = {
  txn: string;
  date: string;
  customer: string;
  amount: string;
  gateway: string;
  status: string;
};

const txns: Txn[] = [
  {
    txn: "pay_NK4521",
    date: "12 Nov",
    customer: "Anita Desai",
    amount: "₹4,616",
    gateway: "Razorpay",
    status: "Success",
  },
  {
    txn: "pay_NK4520",
    date: "12 Nov",
    customer: "Vikram Joshi",
    amount: "₹12,400",
    gateway: "Razorpay",
    status: "Pending",
  },
  {
    txn: "pay_NK4519",
    date: "11 Nov",
    customer: "Sneha Iyer",
    amount: "₹2,950",
    gateway: "Razorpay",
    status: "Success",
  },
  {
    txn: "pay_NK4515",
    date: "10 Nov",
    customer: "Karan M.",
    amount: "₹680",
    gateway: "PhonePe",
    status: "Refunded",
  },
];

const columns: Column<Txn>[] = [
  {
    key: "txn",
    header: "Txn ID",
    render: (r) => <span className="font-mono text-xs">{r.txn}</span>,
  },
  {
    key: "date",
    header: "Date",
    render: (r) => <span className="text-muted-foreground">{r.date}</span>,
  },
  { key: "customer", header: "Customer" },
  {
    key: "amount",
    header: "Amount",
    render: (r) => <span className="font-medium">{r.amount}</span>,
  },
  {
    key: "gateway",
    header: "Gateway",
    render: (r) => <span className="text-muted-foreground">{r.gateway}</span>,
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Billing › Gateway"
        title="Payment Gateway"
        description="Gateway overview and controls."
      />
      <FilterBar searchPlaceholder="Search transactions..." />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={txns} rowKey={(r) => r.txn} />
        <EntriesFooter shown={4} total={4} />
      </Card>
    </>
  );
}
