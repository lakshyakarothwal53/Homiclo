import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { DeleteConfirm } from "@/components/inventory/DeleteConfirm";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBillingBranches,
  useBillingSalesBills,
  useCreateRefund,
  useDeleteSalesBill,
  useNextRefundNumber,
} from "@/hooks/use-billing";
import { fetchPosTransactionItems } from "@/hooks/use-pos";
import { viewSalesBillInvoice } from "@/lib/export-utils";
import { buildSalesBillPdf, downloadCsv, downloadPdf } from "@/lib/pdf-utils";
import { inRange, parseRowDate } from "@/lib/report-data";
import type { BillingSalesBill } from "@/types/billing";

// Line items are only ever linked for a bill sourced live from
// pos_transactions ("All Branches") — a branch-filtered row reads the seeded
// billing_sales_bills_branches snapshot instead, which has no matching
// pos_transaction_items to look up. Either way the PDF still renders, just
// without the itemized table (see buildTaxInvoicePdf, same pattern).
async function handleDownload(bill: BillingSalesBill) {
  try {
    let lines: Awaited<ReturnType<typeof fetchPosTransactionItems>> = [];
    try {
      lines = await fetchPosTransactionItems(bill.invoice);
    } catch {
      lines = [];
    }
    downloadPdf(buildSalesBillPdf(bill, lines), `${bill.invoice}.pdf`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not download bill.");
  }
}

const REFUND_FIELDS: EntityField[] = [
  { key: "reason", label: "Reason", required: true, placeholder: "Damaged item" },
  { key: "amount", label: "Refund Amount (₹)", type: "number", required: true },
];

function parseAmount(s: string) {
  return parseFloat(s.replace(/[₹,\s]/g, "")) || 0;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const Route = createFileRoute("/_app/billing/sales-bills")({
  head: () => ({
    meta: [
      { title: "Sales Bills — HOMIQLO" },
      { name: "description", content: "All issued sales bills." },
    ],
  }),
  component: Page,
});

function Page() {
  const router = useRouter();
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const { data: allBills = [] } = useBillingSalesBills(search, branch);
  const { data: branches = [] } = useBillingBranches();
  // A single `date` with no `dateTo` still behaves as an exact-day filter
  // (inRange with from === to), so this stays a superset of the old
  // matchesDate behavior rather than a separate mode.
  const bills = useMemo(
    () =>
      allBills.filter((b) =>
        inRange(
          parseRowDate(b.bill_date ?? b.date),
          date || undefined,
          dateTo || date || undefined,
        ),
      ),
    [allBills, date, dateTo],
  );
  const { page, setPage, totalPages, pageItems } = usePagination(bills);
  const { data: nextRefund } = useNextRefundNumber();
  const createRefund = useCreateRefund();
  const deleteSalesBill = useDeleteSalesBill();

  function handleDelete(bill: BillingSalesBill) {
    deleteSalesBill.mutate(
      { invoice: bill.invoice, branch },
      {
        onSuccess: () => toast.success(`${bill.invoice} deleted.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete bill."),
      },
    );
  }

  function handleExport() {
    if (bills.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "sales-bills.csv",
      ["Invoice", "Date", "Customer", "Amount", "Payment", "Status"],
      bills.map((b) => [b.invoice, b.date, b.customer, b.amount, b.payment, b.status]),
    );
    toast.success(`Exported ${bills.length} sales bills.`);
  }

  // Downloads every bill currently in view (respects search/branch/date-range)
  // as its own PDF — one file per invoice, same as the per-row Download
  // button, just looped. The browser may ask to allow multiple downloads the
  // first time; that's a browser permission, not something this can skip.
  async function handleDownloadAll() {
    if (bills.length === 0) {
      toast.error("No bills in the selected range.");
      return;
    }
    toast.message(`Downloading ${bills.length} bills…`);
    for (const bill of bills) {
      await handleDownload(bill);
    }
  }

  function handleRefund(bill: BillingSalesBill, v: EntityValues) {
    if (!nextRefund) {
      toast.error("Still loading refund number, try again.");
      return;
    }
    const amountNum = Number(v.amount) || 0;
    createRefund.mutate(
      {
        refund: nextRefund,
        invoice: bill.invoice,
        customer: bill.customer,
        amount: inr(amountNum),
        reason: String(v.reason),
        status: "Processing",
        amount_num: amountNum,
        branch,
      },
      {
        onSuccess: () => toast.success(`Refund ${nextRefund} created for ${bill.invoice}.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not process refund."),
      },
    );
  }

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
      render: (r) => (
        <div className="flex items-center justify-end gap-4">
          <button
            className="text-sm font-medium text-brand hover:underline"
            onClick={() => viewSalesBillInvoice(r)}
          >
            View
          </button>
          <button
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-brand hover:underline"
            onClick={() => handleDownload(r)}
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          {r.status === "Paid" && (
            <EntityFormDialog
              mode="add"
              title={`Refund ${r.invoice}`}
              description={`Process a refund for ${r.customer}.`}
              fields={REFUND_FIELDS}
              initial={{ reason: "", amount: parseAmount(r.amount) }}
              trigger={
                <button className="text-sm font-medium text-muted-foreground hover:text-brand hover:underline">
                  Refund
                </button>
              }
              onSave={(v) => handleRefund(r, v)}
            />
          )}
          <DeleteConfirm label={r.invoice} onConfirm={() => handleDelete(r)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Billing › Sales Bills"
        title="Sales Bills"
        description="Sales Bills overview and controls."
        actions={
          (date || dateTo) && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadAll}>
              <Download className="h-4 w-4" /> Download All ({bills.length})
            </Button>
          )
        }
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoices..."
        date={date}
        onDateChange={setDate}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        addLabel="Add New"
        onAdd={() => router.navigate({ to: "/billing/create-invoice" })}
        onExport={handleExport}
        {...(scoped ? { showBranch: false } : { branches, branch, onBranchChange: setBranch })}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.invoice} />
        <EntriesFooter
          total={bills.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
