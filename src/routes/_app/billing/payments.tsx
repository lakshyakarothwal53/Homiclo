import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { useBillingBranches, useBillingPayments } from "@/hooks/use-billing";
import { downloadPaymentReceipt } from "@/lib/export-utils";
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
  const [branch, setBranch] = useState("all");
  const { data: payments = [] } = useBillingPayments(undefined, branch);
  const { data: branches = [] } = useBillingBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(payments);

  return (
    <>
      <PageHeader
        eyebrow="Billing › Payments"
        title="Payment Collection"
        description="Payments overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search receipts..."
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
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
