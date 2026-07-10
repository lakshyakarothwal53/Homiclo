import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import {
  fetchPosTransactionItems,
  usePosBranches,
  usePosSettings,
  usePosTransactions,
} from "@/hooks/use-pos";
import { printReceipt } from "@/lib/receipt-utils";
import type { PosSettings, PosTransaction } from "@/types/pos";

export const Route = createFileRoute("/_app/pos/transactions")({
  head: () => ({
    meta: [
      { title: "POS Transactions — HOMIQLO" },
      { name: "description", content: "Transactions overview and controls." },
    ],
  }),
  component: Page,
});

async function reprint(r: PosTransaction, settings: PosSettings) {
  try {
    const lines = await fetchPosTransactionItems(r.invoice);
    if (lines.length === 0) {
      toast.error("No saved line items for this bill (created before itemized receipts).");
      return;
    }
    const subtotal = r.subtotal ?? lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = r.discount ?? 0;
    const gst = r.gst ?? 0;
    const total = r.total ?? subtotal - discount + gst;
    printReceipt(
      {
        invoice: r.invoice,
        dateTime: r.time,
        cashier: r.cashier,
        paymentMode: r.payment,
        upiRef: r.upiRef,
        lines,
        subtotal,
        discount,
        gst,
        total,
      },
      settings,
    );
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not reprint.");
  }
}

function Page() {
  const router = useRouter();
  const { settings } = usePosSettings();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data: txns = [] } = usePosTransactions(search, branch);
  const { data: branches = [] } = usePosBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(txns);

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
    {
      key: "action",
      header: "",
      render: (r) => (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => reprint(r, settings)}>
          <Printer className="h-3.5 w-3.5" /> Reprint
        </Button>
      ),
    },
  ];

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
