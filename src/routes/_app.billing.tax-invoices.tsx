import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";

export const Route = createFileRoute("/_app/billing/tax-invoices")({
  head: () => ({
    meta: [
      { title: "Tax Invoices — HOMIQLO" },
      { name: "description", content: "GST tax invoices and exports." },
    ],
  }),
  component: Page,
});

type TaxInvoice = {
  invoice: string;
  date: string;
  gstin: string;
  taxable: string;
  cgst: string;
  sgst: string;
  total: string;
};

const invoices: TaxInvoice[] = [
  {
    invoice: "INV-10248",
    date: "12 Nov",
    gstin: "27ABCDE1234F1Z5",
    taxable: "₹3,912",
    cgst: "₹352",
    sgst: "₹352",
    total: "₹4,616",
  },
  {
    invoice: "INV-10246",
    date: "12 Nov",
    gstin: "27FGHIJ5678K1Z3",
    taxable: "₹10,508",
    cgst: "₹946",
    sgst: "₹946",
    total: "₹12,400",
  },
  {
    invoice: "INV-10245",
    date: "11 Nov",
    gstin: "—",
    taxable: "₹2,500",
    cgst: "₹225",
    sgst: "₹225",
    total: "₹2,950",
  },
];

const columns: Column<TaxInvoice>[] = [
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
  return (
    <>
      <PageHeader
        eyebrow="Billing › Tax Invoices"
        title="Tax Invoices"
        description="Tax Invoices overview and controls."
      />
      <FilterBar searchPlaceholder="Search by GSTIN..." />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={invoices} rowKey={(r) => r.invoice} />
        <EntriesFooter shown={3} total={3} />
      </Card>
    </>
  );
}
