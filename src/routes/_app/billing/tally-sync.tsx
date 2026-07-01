import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RefreshCw, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { cn } from "@/lib/utils";
import { useBillingDashboard, useBillingTallyLog } from "@/hooks/use-billing";
import type { BillingTallyRow } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/tally-sync")({
  head: () => ({
    meta: [
      { title: "Tally Sync — HOMIQLO" },
      { name: "description", content: "Sync ledgers with Tally ERP." },
    ],
  }),
  component: Page,
});

const columns: Column<BillingTallyRow>[] = [
  {
    key: "time",
    header: "Time",
    render: (r) => <span className="text-muted-foreground">{r.time}</span>,
  },
  { key: "voucher", header: "Voucher Type" },
  {
    key: "reference",
    header: "Reference",
    render: (r) => <span className="font-mono text-xs">{r.reference}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    render: (r) => <span className="font-medium">{r.amount}</span>,
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

function SyncStat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof RefreshCw;
  tone: "success" | "warning" | "danger";
}) {
  const toneClass = {
    success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]",
    warning: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning)]",
    danger: "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand",
  }[tone];

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const [syncing, setSyncing] = useState(false);
  const { data: dashboard } = useBillingDashboard();
  const { data: log = [] } = useBillingTallyLog();

  const syncNow = () => {
    setSyncing(true);
    toast.loading("Syncing with Tally...", { id: "tally" });
    setTimeout(() => {
      setSyncing(false);
      toast.success("Sync complete · 3 vouchers pushed", { id: "tally" });
    }, 1400);
  };

  return (
    <>
      <PageHeader
        eyebrow="Billing › Tally Sync"
        title="Tally Sync"
        description="Tally Sync overview and controls."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SyncStat
          label="Synced Today"
          value={dashboard?.tallySyncedToday ?? "—"}
          hint={dashboard?.tallySyncedHint ?? ""}
          icon={RefreshCw}
          tone="success"
        />
        <SyncStat
          label="Pending Sync"
          value={dashboard?.tallyPendingSync ?? "—"}
          hint={dashboard?.tallyPendingHint ?? ""}
          icon={Clock}
          tone="warning"
        />
        <SyncStat
          label="Failed"
          value={dashboard?.tallyFailed ?? "—"}
          hint={dashboard?.tallyFailedHint ?? ""}
          icon={AlertCircle}
          tone="danger"
        />
      </div>

      <Card className="mt-6 overflow-hidden border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border">
          <CardTitle className="text-base">Sync Log</CardTitle>
          <Button
            size="sm"
            disabled={syncing}
            onClick={syncNow}
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> Sync Now
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} rows={log} rowKey={(r) => r.time + r.reference} />
        </CardContent>
      </Card>
    </>
  );
}
