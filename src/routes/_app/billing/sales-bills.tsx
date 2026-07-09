import { useState } from "react";
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
  useBillingSalesBills,
  useCreateRefund,
  useNextRefundNumber,
} from "@/hooks/use-billing";
import { viewSalesBillInvoice } from "@/lib/export-utils";
import type { BillingSalesBill } from "@/types/billing";

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
  const [branch, setBranch] = useState("all");
  const { data: bills = [] } = useBillingSalesBills(undefined, branch);
  const { data: branches = [] } = useBillingBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(bills);
  const { data: nextRefund } = useNextRefundNumber();
  const createRefund = useCreateRefund();

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
      />
      <FilterBar
        searchPlaceholder="Search invoices..."
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
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
