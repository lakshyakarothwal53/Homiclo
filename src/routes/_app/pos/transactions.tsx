import { useMemo, useState } from "react";
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
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import {
  fetchPosTransactionItems,
  usePosBranches,
  usePosSettings,
  usePosTransactions,
} from "@/hooks/use-pos";
import { printReceipt } from "@/lib/receipt-utils";
import { matchesDate, parseRowDate } from "@/lib/report-data";
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

    // Rebuild the per-slab tax breakdown from the snapshot stored on each line,
    // so a reprint itemises tax exactly as the original bill did. Taxable value
    // re-apportions the transaction discount by line value — the same rule
    // checkout used (see CartProvider). Bills predating the snapshot have no
    // gstRate, so the receipt falls back to a single flat GST line.
    const rated = lines.filter((l) => l.gstRate !== undefined && l.gstRate !== null);
    let gstBreakdown: { rate: number; taxable: number; tax: number }[] | undefined;
    if (rated.length === lines.length && lines.length > 0) {
      const buckets = new Map<number, { taxable: number; tax: number }>();
      let allocated = 0;
      lines.forEach((l, i) => {
        const share =
          i === lines.length - 1
            ? discount - allocated
            : subtotal > 0
              ? Math.round(discount * (l.lineTotal / subtotal))
              : 0;
        allocated += share;
        const rate = l.gstRate as number;
        const cur = buckets.get(rate) ?? { taxable: 0, tax: 0 };
        cur.taxable += Math.max(0, l.lineTotal - share);
        cur.tax += l.gstAmount ?? 0;
        buckets.set(rate, cur);
      });
      gstBreakdown = [...buckets.entries()]
        .map(([rate, b]) => ({ rate, taxable: b.taxable, tax: Math.round(b.tax) }))
        .sort((a, b) => a.rate - b.rate);
    }

    const mrpTotal = lines.reduce((s, l) => s + (l.mrp ?? l.unitPrice) * l.qty, 0);

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
        gstBreakdown,
        mrpTotal,
        mrpSavings: Math.max(0, mrpTotal - (subtotal - discount)),
        customerName: r.customerName,
        customerMobile: r.customerMobile,
        customerDob: r.customerDob,
        customerGstin: r.customerGstin,
        invoiceDate: r.invoiceDate,
      },
      settings,
    );
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not reprint.");
  }
}

function Page() {
  const router = useRouter();
  const { scoped, homeBranch } = useBranchScope();
  const { settings } = usePosSettings();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [date, setDate] = useState("");
  const { data: allTxns = [] } = usePosTransactions(search, branch);
  const txns = useMemo(
    () => allTxns.filter((t) => matchesDate(date, t.createdAt)),
    [allTxns, date],
  );
  const { data: branches = [] } = usePosBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(txns);

  const columns: Column<PosTransaction>[] = [
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <span className="text-muted-foreground">
          {parseRowDate(r.createdAt)?.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) ?? "—"}
        </span>
      ),
    },
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => reprint(r, settings)}
        >
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
        date={date}
        onDateChange={setDate}
        {...(scoped ? { showBranch: false } : { branches, branch, onBranchChange: setBranch })}
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
