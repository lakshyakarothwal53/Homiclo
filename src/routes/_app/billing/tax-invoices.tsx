import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { useTableQuery } from "@/components/billing/use-table-query";
import { exportToExcel } from "@/lib/export";
import { useBillingTaxInvoices } from "@/hooks/use-billing";
import type { BillingTaxInvoice } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/tax-invoices")({
  head: () => ({
    meta: [
      { title: "Tax Invoices — HOMIQLO" },
      { name: "description", content: "GST tax invoices and exports." },
    ],
  }),
  component: Page,
});

const columns: Column<BillingTaxInvoice>[] = [
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
  {
    key: "gstin",
    header: "GSTIN",
    render: (r) => <span className="font-mono text-xs">{r.gstin}</span>,
  },
  { key: "taxable", header: "Taxable Amount" },
  {
    key: "cgst",
    header: "CGST",
    render: (r) => <span className="text-muted-foreground">{r.cgst}</span>,
  },
  {
    key: "sgst",
    header: "SGST",
    render: (r) => <span className="text-muted-foreground">{r.sgst}</span>,
  },
  { key: "total", header: "Total", render: (r) => <span className="font-medium">{r.total}</span> },
];

function Page() {
  const { data: invoices = [] } = useBillingTaxInvoices();
  const { search, setSearch, amountSort, setAmountSort, amountRange, setAmountRange, rows } =
    useTableQuery(invoices, ["invoice", "gstin"], "total");

  function handleExport() {
    exportToExcel(
      "tax-invoices",
      ["Invoice", "Date", "GSTIN", "Taxable Amount", "CGST", "SGST", "Total"],
      rows.map((r) => [r.invoice, r.date, r.gstin, r.taxable, r.cgst, r.sgst, r.total]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Billing › Tax Invoices"
        title="Tax Invoices"
        description="Tax Invoices overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search by GSTIN..."
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
