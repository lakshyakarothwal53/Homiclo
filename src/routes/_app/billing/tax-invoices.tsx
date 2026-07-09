import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { useBillingBranches, useBillingTaxInvoices } from "@/hooks/use-billing";
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
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data: invoices = [] } = useBillingTaxInvoices(search, branch);
  const { data: branches = [] } = useBillingBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(invoices);

  return (
    <>
      <PageHeader
        eyebrow="Billing › Tax Invoices"
        title="Tax Invoices"
        description="Tax Invoices overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by GSTIN..."
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.invoice} />
        <EntriesFooter
          total={invoices.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
