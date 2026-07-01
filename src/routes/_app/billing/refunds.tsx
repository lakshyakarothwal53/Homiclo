import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { useTableQuery } from "@/components/billing/use-table-query";
import { exportToExcel } from "@/lib/export";
import { useBillingRefunds } from "@/hooks/use-billing";
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
  const { data: refunds = [] } = useBillingRefunds();
  const { search, setSearch, amountSort, setAmountSort, amountRange, setAmountRange, rows } =
    useTableQuery(refunds, ["refund", "invoice", "customer", "reason"], "amount");

  function handleExport() {
    exportToExcel(
      "refunds",
      ["Refund ID", "Original Invoice", "Customer", "Amount", "Reason", "Status"],
      rows.map((r) => [r.refund, r.invoice, r.customer, r.amount, r.reason, r.status]),
    );
  }

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
        search={search}
        onSearchChange={setSearch}
        onExport={handleExport}
        amountSort={amountSort}
        onAmountSortChange={setAmountSort}
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.refund} />
      </Card>
    </>
  );
}
