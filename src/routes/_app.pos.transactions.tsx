import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { EntriesFooter } from "@/components/billing/EntriesFooter";

export const Route = createFileRoute("/_app/pos/transactions")({
  head: () => ({
    meta: [
      { title: "POS Transactions — HOMIQLO" },
      { name: "description", content: "Transactions overview and controls." },
    ],
  }),
  component: Page,
});

type Txn = {
  time: string;
  invoice: string;
  items: number;
  amount: string;
  payment: string;
  cashier: string;
  status: string;
};

const txns: Txn[] = [
  { time: "14:22", invoice: "INV-10248", items: 3, amount: "₹4,616", payment: "UPI", cashier: "R. Kapoor", status: "Completed" },
  { time: "13:55", invoice: "INV-10247", items: 2, amount: "₹1,820", payment: "Cash", cashier: "K. Mehta", status: "Completed" },
  { time: "13:30", invoice: "INV-10246", items: 5, amount: "₹12,400", payment: "Card", cashier: "R. Kapoor", status: "Pending" },
  { time: "12:18", invoice: "INV-10245", items: 1, amount: "₹2,950", payment: "UPI", cashier: "K. Mehta", status: "Completed" },
  { time: "11:45", invoice: "INV-10244", items: 2, amount: "₹680", payment: "Cash", cashier: "R. Kapoor", status: "Refunded" },
];

const columns: Column<Txn>[] = [
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
  { key: "amount", header: "Amount", render: (r) => <span className="font-medium">{r.amount}</span> },
  {
    key: "payment",
    header: "Payment",
    render: (r) => <span className="text-muted-foreground">{r.payment}</span>,
  },
  { key: "cashier", header: "Cashier" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="POS › Transactions"
        title="POS Transactions"
        description="Transactions overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search..."
        addLabel="Add New"
        onAdd={() => toast.info("Start a new sale from the POS Dashboard")}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={txns} rowKey={(r) => r.invoice} />
        <EntriesFooter shown={txns.length} total={txns.length} />
      </Card>
    </>
  );
}
