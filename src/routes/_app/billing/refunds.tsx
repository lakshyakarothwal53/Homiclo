import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { useBillingBranches, useBillingRefunds } from "@/hooks/use-billing";
import type { BillingRefund } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Management — HOMIQLO" },
      { name: "description", content: "Process and track refund requests." },
    ],
  }),
  component: Page,
});

const columns: Column<BillingRefund>[] = [
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
  const [branch, setBranch] = useState("all");
  const { data: refunds = [] } = useBillingRefunds(undefined, branch);
  const { data: branches = [] } = useBillingBranches();

  return (
    <>
      <PageHeader
        eyebrow="Billing › Refunds"
        title="Refund Management"
        description="Refunds overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search refunds..."
        addLabel="Add New"
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={refunds} rowKey={(r) => r.refund} />
        <EntriesFooter shown={refunds.length} total={refunds.length} />
      </Card>
    </>
  );
}
