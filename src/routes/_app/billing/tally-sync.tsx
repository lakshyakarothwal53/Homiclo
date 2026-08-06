import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RefreshCw, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { StatusBadge } from "@/components/billing/StatusBadge";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { useBillingTallyLog, useTallyStats, useTallySync } from "@/hooks/use-billing";
import { useBranchScope } from "@/hooks/use-branch-scope";
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
  const { homeBranch } = useBranchScope();
  const { data: stats } = useTallyStats(homeBranch);
  const { data: log = [] } = useBillingTallyLog(homeBranch);
  const tallySync = useTallySync(homeBranch);
  const syncing = tallySync.isPending;
  const { page, setPage, totalPages, pageItems } = usePagination(log);

  const syncNow = () => {
    toast.loading("Syncing with Tally...", { id: "tally" });
    tallySync.mutate(undefined, {
      onSuccess: ({ pushed, failed, sampleError }) => {
        if (pushed === 0 && failed === 0) {
          toast.success("Everything already synced — no pending vouchers.", { id: "tally" });
        } else if (failed === 0) {
          toast.success(`Sync complete · ${pushed} voucher${pushed !== 1 ? "s" : ""} pushed`, {
            id: "tally",
          });
        } else {
          const base = sampleError ?? "check the Tally server in Settings › Tally.";
          const hint = /SVCurrentCompany/i.test(sampleError ?? "")
            ? " Open that exact company in Tally Prime on the server, then Sync Now again."
            : "";
          toast.warning(`${pushed} pushed, ${failed} failed — ${base}${hint}`, { id: "tally" });
        }
      },
      onError: (e) =>
        toast.error(
          e instanceof Error
            ? `${e.message} — run supabase/13_completion_pack.sql to enable the sync log.`
            : "Sync failed.",
          { id: "tally" },
        ),
    });
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
          value={stats ? String(stats.syncedToday) : "—"}
          hint={stats ? `${stats.syncedTotal} vouchers synced in total` : ""}
          icon={RefreshCw}
          tone="success"
        />
        <SyncStat
          label="Pending Sync"
          value={stats ? String(stats.pending) : "—"}
          hint={stats ? "Sales bills not yet pushed to Tally" : ""}
          icon={Clock}
          tone="warning"
        />
        <SyncStat
          label="Failed"
          value={stats ? String(stats.failed) : "—"}
          hint={stats ? "Attempts that could not reach Tally" : ""}
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
          <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.time + r.reference} />
          <EntriesFooter
            total={log.length}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
