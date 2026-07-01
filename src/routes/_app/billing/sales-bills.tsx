import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { useBillingBranches, useBillingSalesBills } from "@/hooks/use-billing";
import type { BillingSalesBill } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/sales-bills")({
  head: () => ({
    meta: [
      { title: "Sales Bills — HOMIQLO" },
      { name: "description", content: "All issued sales bills." },
    ],
  }),
  component: Page,
});

const columns: Column<BillingSalesBill>[] = [
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
  const [branch, setBranch] = useState("all");
  const { data: bills = [] } = useBillingSalesBills(undefined, branch);
  const { data: branches = [] } = useBillingBranches();

  return (
    <>
      <PageHeader
        eyebrow="Billing › Sales Bills"
        title="Sales Bills"
        description="Sales Bills overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search invoices..."
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={bills} rowKey={(r) => r.invoice} />
        <EntriesFooter shown={bills.length} total={bills.length} />
      </Card>
    </>
  );
}
