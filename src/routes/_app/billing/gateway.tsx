import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { useBillingGatewayTxns } from "@/hooks/use-billing";
import type { BillingGatewayTxn } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/gateway")({
  head: () => ({
    meta: [
      { title: "Payment Gateway — HOMIQLO" },
      { name: "description", content: "Online transactions and settlements." },
    ],
  }),
  component: Page,
});

const columns: Column<BillingGatewayTxn>[] = [
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
  const { data: txns = [] } = useBillingGatewayTxns();

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
        <EntriesFooter shown={txns.length} total={txns.length} />
      </Card>
    </>
  );
}
