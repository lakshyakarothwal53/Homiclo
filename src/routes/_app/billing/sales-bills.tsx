import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";

export const Route = createFileRoute("/_app/billing/sales-bills")({
  head: () => ({
    meta: [
      { title: "Sales Bills — HOMIQLO" },
      { name: "description", content: "All issued sales bills." },
    ],
  }),
  component: Page,
});

type Bill = {
  invoice: string;
  date: string;
  customer: string;
  amount: string;
  payment: string;
  status: string;
};

const bills: Bill[] = [
  {
    invoice: "INV-10248",
    date: "12 Nov",
    customer: "Anita Desai",
    amount: "₹4,616",
    payment: "UPI",
    status: "Paid",
  },
  {
    invoice: "INV-10247",
    date: "12 Nov",
    customer: "Walk-in",
    amount: "₹1,820",
    payment: "Cash",
    status: "Paid",
  },
  {
    invoice: "INV-10246",
    date: "12 Nov",
    customer: "Vikram Joshi",
    amount: "₹12,400",
    payment: "Card",
    status: "Pending",
  },
  {
    invoice: "INV-10245",
    date: "11 Nov",
    customer: "Sneha Iyer",
    amount: "₹2,950",
    payment: "UPI",
    status: "Paid",
  },
  {
    invoice: "INV-10244",
    date: "11 Nov",
    customer: "Rahul Nair",
    amount: "₹680",
    payment: "Cash",
    status: "Refunded",
  },
];

const columns: Column<Bill>[] = [
  {
    key: "invoice",
    header: "Invoice",
    render: (r) => <span className="font-mono text-xs">{r.invoice}</span>,
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
    key: "payment",
    header: "Payment",
    render: (r) => <span className="text-muted-foreground">{r.payment}</span>,
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "action",
    header: "",
    align: "right",
    render: () => <button className="text-sm font-medium text-brand hover:underline">View</button>,
  },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Billing › Sales Bills"
        title="Sales Bills"
        description="Sales Bills overview and controls."
      />
      <FilterBar searchPlaceholder="Search invoices..." />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={bills} rowKey={(r) => r.invoice} />
        <EntriesFooter shown={5} total={5} />
      </Card>
    </>
  );
}
