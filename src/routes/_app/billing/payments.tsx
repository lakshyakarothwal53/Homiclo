import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { useBillingPayments } from "@/hooks/use-billing";
import type { BillingPayment } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/payments")({
  head: () => ({
    meta: [
      { title: "Payment Collection — HOMIQLO" },
      { name: "description", content: "Collected payments and pending dues." },
    ],
  }),
  component: Page,
});

const columns: Column<BillingPayment>[] = [
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
  const { data: payments = [] } = useBillingPayments();

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
        <EntriesFooter shown={payments.length} total={payments.length} />
      </Card>
    </>
  );
}
