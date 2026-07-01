import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { useTableQuery } from "@/components/billing/use-table-query";
import { exportToExcel } from "@/lib/export";
import { useBillingSalesBills } from "@/hooks/use-billing";
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
  const { data: bills = [] } = useBillingSalesBills();
  const { search, setSearch, amountSort, setAmountSort, amountRange, setAmountRange, rows } =
    useTableQuery(bills, ["invoice", "customer", "payment"], "amount");

  function handleExport() {
    exportToExcel(
      "sales-bills",
      ["Invoice", "Date", "Customer", "Amount", "Payment", "Status"],
      rows.map((r) => [r.invoice, r.date, r.customer, r.amount, r.payment, r.status]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Billing › Sales Bills"
        title="Sales Bills"
        description="Sales Bills overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search invoices..."
        search={search}
        onSearchChange={setSearch}
        onExport={handleExport}
        amountSort={amountSort}
        onAmountSortChange={setAmountSort}
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.invoice} />
      </Card>
    </>
  );
}
