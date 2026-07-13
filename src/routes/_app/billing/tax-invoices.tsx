import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { useBillingBranches, useBillingTaxInvoices } from "@/hooks/use-billing";
import { downloadCsv } from "@/lib/pdf-utils";
import { matchesDate } from "@/lib/report-data";
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
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState("all");
  const { data: allInvoices = [] } = useBillingTaxInvoices(search, branch);
  const { data: branches = [] } = useBillingBranches();
  const invoices = useMemo(
    () => allInvoices.filter((i) => matchesDate(date, i.date)),
    [allInvoices, date],
  );
  const { page, setPage, totalPages, pageItems } = usePagination(invoices);

  function handleExport() {
    if (invoices.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "tax-invoices.csv",
      ["Invoice", "Date", "GSTIN", "Taxable", "CGST", "SGST", "Total"],
      invoices.map((i) => [i.invoice, i.date, i.gstin, i.taxable, i.cgst, i.sgst, i.total]),
    );
    toast.success(`Exported ${invoices.length} tax invoices.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Billing › Tax Invoices"
        title="Tax Invoices"
        description="GST tax invoices — every completed sale where the customer supplied a GSTIN at checkout."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by invoice or GSTIN..."
        date={date}
        onDateChange={setDate}
        onExport={handleExport}
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
