import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBillingBranches,
  useBillingTaxInvoices,
  useCreateTaxInvoice,
} from "@/hooks/use-billing";
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

const TAX_INVOICE_FIELDS: EntityField[] = [
  { key: "invoice", label: "Invoice No.", required: true, placeholder: "INV-10248" },
  { key: "gstin", label: "GSTIN", required: true, placeholder: "27ABCDE1234F1Z5" },
  { key: "total", label: "Total incl. GST (₹)", type: "number", required: true },
];

const GST_RATE = 0.18;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const displayDate = (d: Date) => `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;

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
  const [addOpen, setAddOpen] = useState(false);
  const { data: allInvoices = [] } = useBillingTaxInvoices(search, branch);
  const { data: branches = [] } = useBillingBranches();
  const createTaxInvoice = useCreateTaxInvoice();
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

  function handleAdd(v: EntityValues) {
    const total = Number(v.total) || 0;
    const taxable = total / (1 + GST_RATE);
    const gstHalf = (total - taxable) / 2;
    createTaxInvoice.mutate(
      {
        invoice: String(v.invoice),
        date: displayDate(new Date()),
        gstin: String(v.gstin),
        taxable: inr(taxable),
        cgst: inr(gstHalf),
        sgst: inr(gstHalf),
        total: inr(total),
      },
      {
        onSuccess: () => toast.success(`Tax invoice ${v.invoice} added.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add tax invoice."),
      },
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
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by GSTIN..."
        date={date}
        onDateChange={setDate}
        addLabel="Add New"
        onAdd={() => setAddOpen(true)}
        onExport={handleExport}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <EntityFormDialog
        mode="add"
        title="New Tax Invoice"
        description="Record a GST tax invoice (18% GST split into CGST + SGST)."
        fields={TAX_INVOICE_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
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
