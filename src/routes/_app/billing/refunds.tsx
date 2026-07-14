import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { RefundStatusSelect } from "@/components/billing/RefundStatusSelect";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { NewRefundDialog } from "@/components/billing/NewRefundDialog";
import { usePagination } from "@/hooks/use-pagination";
import { useBillingBranches, useBillingRefunds, useUpdateRefundStatus } from "@/hooks/use-billing";
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

function Page() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { data: allRefunds = [] } = useBillingRefunds(search, branch);
  const { data: branches = [] } = useBillingBranches();
  const updateStatus = useUpdateRefundStatus();
  const refunds = useMemo(
    () => allRefunds.filter((r) => matchesDate(date, r.refund_date)),
    [allRefunds, date],
  );
  const { page, setPage, totalPages, pageItems } = usePagination(refunds);

  function handleStatusChange(refund: string, status: string) {
    updateStatus.mutate(
      { refund, status },
      {
        onSuccess: () => toast.success(`${refund} marked ${status}.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update status."),
      },
    );
  }

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
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <RefundStatusSelect
          status={r.status}
          disabled={updateStatus.isPending}
          onChange={(status) => handleStatusChange(r.refund, status)}
        />
      ),
    },
  ];

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
      <NewRefundDialog open={addOpen} onOpenChange={setAddOpen} />
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
