import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";

export const Route = createFileRoute("/_app/billing/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Management — HOMIQLO" },
      { name: "description", content: "Process and track refund requests." },
    ],
  }),
  component: Page,
});

type Refund = {
  refund: string;
  invoice: string;
  customer: string;
  amount: string;
  reason: string;
  status: string;
};

const refunds: Refund[] = [
  {
    refund: "REF-201",
    invoice: "INV-10244",
    customer: "Rahul Nair",
    amount: "₹680",
    reason: "Damaged item",
    status: "Completed",
  },
  {
    refund: "REF-200",
    invoice: "INV-10230",
    customer: "Maya P.",
    amount: "₹1,299",
    reason: "Size mismatch",
    status: "Completed",
  },
  {
    refund: "REF-199",
    invoice: "INV-10221",
    customer: "Suresh K.",
    amount: "₹450",
    reason: "Wrong product",
    status: "Processing",
  },
];

const columns: Column<Refund>[] = [
  {
    key: "refund",
    header: "Refund ID",
    render: (r) => <span className="font-mono text-xs">{r.refund}</span>,
  },
  {
    key: "invoice",
    header: "Original Invoice",
    render: (r) => <span className="font-mono text-xs">{r.invoice}</span>,
  },
  { key: "customer", header: "Customer" },
  {
    key: "amount",
    header: "Amount",
    render: (r) => <span className="font-medium">{r.amount}</span>,
  },
  {
    key: "reason",
    header: "Reason",
    render: (r) => <span className="text-muted-foreground">{r.reason}</span>,
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Billing › Refunds"
        title="Refund Management"
        description="Refunds overview and controls."
      />
      <FilterBar searchPlaceholder="Search refunds..." addLabel="Add New" />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={refunds} rowKey={(r) => r.refund} />
        <EntriesFooter shown={3} total={3} />
      </Card>
    </>
  );
}
