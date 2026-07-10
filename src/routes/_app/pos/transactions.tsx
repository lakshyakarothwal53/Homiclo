import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { usePosBranches, usePosTransactions } from "@/hooks/use-pos";
import type { PosTransaction } from "@/types/pos";

export const Route = createFileRoute("/_app/pos/transactions")({
  head: () => ({
    meta: [
      { title: "POS Transactions — HOMIQLO" },
      { name: "description", content: "Transactions overview and controls." },
    ],
  }),
  component: Page,
});

const columns: Column<PosTransaction>[] = [
  {
    key: "time",
    header: "Time",
    render: (r) => <span className="text-muted-foreground">{r.time}</span>,
  },
  {
    key: "invoice",
    header: "Invoice",
    render: (r) => <span className="font-mono text-xs">{r.invoice}</span>,
  },
  { key: "items", header: "Items" },
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
  { key: "cashier", header: "Cashier" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

function Page() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data: txns = [] } = usePosTransactions(search, branch);
  const { data: branches = [] } = usePosBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(txns);

  return (
    <>
      <PageHeader
        eyebrow="POS › Transactions"
        title="POS Transactions"
        description="Transactions overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice or cashier..."
        addLabel="Add New"
        onAdd={() => router.navigate({ to: "/pos" })}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.invoice} />
        <EntriesFooter
          total={txns.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
