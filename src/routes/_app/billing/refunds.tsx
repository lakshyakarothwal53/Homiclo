import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
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
import { usePagination } from "@/hooks/use-pagination";
import {
  useBillingBranches,
  useBillingRefunds,
  useCreateRefund,
  useNextRefundNumber,
} from "@/hooks/use-billing";
import { downloadCsv } from "@/lib/pdf-utils";
import { matchesDate } from "@/lib/report-data";
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

const REFUND_FIELDS: EntityField[] = [
  { key: "invoice", label: "Original Invoice", required: true, placeholder: "INV-10248" },
  { key: "customer", label: "Customer", required: true, placeholder: "Anita Desai" },
  { key: "amount", label: "Refund Amount (₹)", type: "number", required: true },
  { key: "reason", label: "Reason", required: true, placeholder: "Damaged item" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Processing", "Completed", "Rejected"],
    required: true,
  },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

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
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { data: allRefunds = [] } = useBillingRefunds(search, branch);
  const { data: branches = [] } = useBillingBranches();
  const { data: nextRefund } = useNextRefundNumber();
  const createRefund = useCreateRefund();
  const refunds = useMemo(
    () => allRefunds.filter((r) => matchesDate(date, r.refund_date)),
    [allRefunds, date],
  );
  const { page, setPage, totalPages, pageItems } = usePagination(refunds);

  function handleExport() {
    if (refunds.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "refunds.csv",
      ["Refund", "Invoice", "Customer", "Amount", "Reason", "Status"],
      refunds.map((r) => [r.refund, r.invoice, r.customer, r.amount, r.reason, r.status]),
    );
    toast.success(`Exported ${refunds.length} refunds.`);
  }

  function handleAdd(v: EntityValues) {
    if (!nextRefund) {
      toast.error("Still loading refund number, try again.");
      return;
    }
    const amountNum = Number(v.amount) || 0;
    createRefund.mutate(
      {
        refund: nextRefund,
        invoice: String(v.invoice),
        customer: String(v.customer),
        amount: inr(amountNum),
        reason: String(v.reason),
        status: String(v.status),
        amount_num: amountNum,
      },
      {
        onSuccess: () => toast.success(`Refund ${nextRefund} created.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create refund."),
      },
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
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search refunds..."
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
        title="New Refund"
        description="Process a refund against an existing invoice."
        fields={REFUND_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.refund} />
        <EntriesFooter
          total={refunds.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
