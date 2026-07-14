import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBillingBranches,
  useBillingPayments,
  useCreateBillingPayment,
  useNextReceiptNumber,
} from "@/hooks/use-billing";
import { downloadPaymentReceipt } from "@/lib/export-utils";
import { downloadCsv } from "@/lib/pdf-utils";
import { matchesDate } from "@/lib/report-data";
import type { BillingPayment } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/payments")({
  head: () => ({
    meta: [
      { title: "Payment Collection — HOMIQLO" },
      { name: "description", content: "Collected payments and pending dues." },
    ],
  }),
  component: Page,
});

const PAYMENT_FIELDS: EntityField[] = [
  { key: "customer", label: "Customer", required: true, placeholder: "Anita Desai" },
  { key: "invoice", label: "Invoice No.", required: true, placeholder: "INV-10248" },
  { key: "amount", label: "Amount (₹)", type: "number", required: true },
  {
    key: "mode",
    label: "Mode",
    type: "select",
    options: ["UPI", "Cash", "Card", "NEFT"],
    required: true,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Received", "Pending"],
    required: true,
  },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const displayDate = (d: Date) => `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;

const columns: Column<BillingPayment>[] = [
  {
    key: "date",
    header: "Date",
    render: (r) => <span className="text-muted-foreground">{r.date}</span>,
  },
  {
    key: "receipt",
    header: "Receipt",
    render: (r) => <span className="font-mono text-xs">{r.receipt}</span>,
  },
  { key: "customer", header: "Customer" },
  {
    key: "invoice",
    header: "Invoice",
    render: (r) => <span className="font-mono text-xs">{r.invoice}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    render: (r) => <span className="font-medium">{r.amount}</span>,
  },
  {
    key: "mode",
    header: "Mode",
    render: (r) => <span className="text-muted-foreground">{r.mode}</span>,
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "action",
    header: "",
    align: "right",
    render: (r) => (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-brand hover:text-brand"
        onClick={() => downloadPaymentReceipt(r)}
      >
        <Download className="h-3.5 w-3.5" /> Download
      </Button>
    ),
  },
];

function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [addOpen, setAddOpen] = useState(false);
  const { data: allPayments = [] } = useBillingPayments(search, branch);
  const { data: branches = [] } = useBillingBranches();
  const { data: nextReceipt } = useNextReceiptNumber();
  const createPayment = useCreateBillingPayment();
  const payments = useMemo(
    () => allPayments.filter((p) => matchesDate(date, p.pay_date, p.date)),
    [allPayments, date],
  );
  const { page, setPage, totalPages, pageItems } = usePagination(payments);

  function handleExport() {
    if (payments.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "payments.csv",
      ["Receipt", "Date", "Customer", "Invoice", "Amount", "Mode", "Status"],
      payments.map((p) => [p.receipt, p.date, p.customer, p.invoice, p.amount, p.mode, p.status]),
    );
    toast.success(`Exported ${payments.length} payments.`);
  }

  function handleAdd(v: EntityValues) {
    if (!nextReceipt) {
      toast.error("Still loading receipt number, try again.");
      return;
    }
    const now = new Date();
    const amountNum = Number(v.amount) || 0;
    createPayment.mutate(
      {
        receipt: nextReceipt,
        date: displayDate(now),
        customer: String(v.customer),
        invoice: String(v.invoice),
        amount: inr(amountNum),
        mode: String(v.mode),
        status: String(v.status),
        pay_date: now.toISOString().slice(0, 10),
        amount_num: amountNum,
        branch,
      },
      {
        onSuccess: () => toast.success(`Payment ${nextReceipt} recorded.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record payment."),
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Billing › Payments"
        title="Payment Collection"
        description="Payments overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search receipts..."
        date={date}
        onDateChange={setDate}
        addLabel="Add New"
        onAdd={() => setAddOpen(true)}
        onExport={handleExport}
        {...(scoped ? { showBranch: false } : { branches, branch, onBranchChange: setBranch })}
      />
      <EntityFormDialog
        mode="add"
        title="Record Payment"
        description="Record a payment received against an invoice."
        fields={PAYMENT_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.receipt} />
        <EntriesFooter
          total={payments.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
