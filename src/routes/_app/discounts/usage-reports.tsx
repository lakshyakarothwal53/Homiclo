import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, IndianRupee, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DiscountToolbar } from "@/components/discounts/DiscountToolbar";
import { UsageDialog } from "@/components/discounts/UsageDialog";
import { downloadCsv, formatCurrency } from "@/components/discounts/types";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import {
  useDiscountBranches,
  useDiscountUsage,
  useCreateUsage,
  useUpdateUsage,
  useDeleteUsage,
} from "@/hooks/use-discounts";
import type { DiscountUsageInput } from "@/types/discounts";

export const Route = createFileRoute("/_app/discounts/usage-reports")({
  head: () => ({
    meta: [
      { title: "Usage Reports — HOMIQLO" },
      { name: "description", content: "Discount redemption analytics." },
    ],
  }),
  component: Page,
});

function Page() {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All Branches");
  const [date, setDate] = useState("");

  const { data: usage = [], isLoading } = useDiscountUsage(branch);
  const { data: branches = [] } = useDiscountBranches();

  const createUsage = useCreateUsage();
  const updateUsage = useUpdateUsage();
  const deleteUsage = useDeleteUsage();

  function handleCreate(values: DiscountUsageInput) {
    createUsage.mutate(values, {
      onSuccess: () => toast.success(`${values.discount} added.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add usage record."),
    });
  }

  function handleUpdate(originalCode: string, values: DiscountUsageInput) {
    updateUsage.mutate(
      { ...values, originalCode },
      {
        onSuccess: () => toast.success(`${values.discount} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update record."),
      },
    );
  }

  function handleDelete(code: string, discount: string) {
    deleteUsage.mutate(code, {
      onSuccess: () => toast.success(`${discount} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete record."),
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usage;
    return usage.filter(
      (r) => r.discount.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  }, [query, usage]);

  const { page, setPage, totalPages, pageItems } = usePagination(filtered);

  const totals = useMemo(() => {
    const used = usage.reduce((s, r) => s + r.timesUsed, 0);
    const given = usage.reduce((s, r) => s + r.discountGiven, 0);
    const conv = usage.length ? usage.reduce((s, r) => s + r.conversion, 0) / usage.length : 0;
    return { used, given, conv: Math.round(conv) };
  }, [usage]);

  function handleExport() {
    downloadCsv(
      "discount-usage-reports.csv",
      ["Discount", "Code", "Times Used", "Discount Given", "Avg. Order", "Conversion"],
      filtered.map((r) => [
        r.discount,
        r.code,
        r.timesUsed,
        formatCurrency(r.discountGiven),
        formatCurrency(r.avgOrder),
        `${r.conversion}%`,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Discounts › Usage"
        title="Discount Usage Reports"
        description="Usage overview and controls."
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Redemptions"
          value={String(totals.used)}
          hint="Across all promos"
          icon={CheckCircle2}
        />
        <StatCard
          label="Discount Given"
          value={formatCurrency(totals.given)}
          hint="This month"
          icon={IndianRupee}
        />
        <StatCard
          label="Avg. Conversion"
          value={`${totals.conv}%`}
          hint="Promo → checkout"
          icon={TrendingUp}
        />
      </div>

      <DiscountToolbar
        query={query}
        onQuery={setQuery}
        branch={branch}
        onBranch={setBranch}
        branches={branches}
        date={date}
        onDate={setDate}
        onExport={handleExport}
        addSlot={<UsageDialog mode="add" onSave={handleCreate} />}
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Discount</th>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Times Used</th>
                  <th className="px-5 py-3 text-left font-medium">Discount Given</th>
                  <th className="px-5 py-3 text-left font-medium">Avg. Order</th>
                  <th className="px-5 py-3 text-left font-medium">Conversion</th>
                  <th className="px-5 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.code} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.discount}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {r.code}
                    </td>
                    <td className="px-5 py-3.5">{r.timesUsed}</td>
                    <td className="px-5 py-3.5">{formatCurrency(r.discountGiven)}</td>
                    <td className="px-5 py-3.5">{formatCurrency(r.avgOrder)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-[color:var(--success)]"
                            style={{ width: `${r.conversion}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{r.conversion}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <UsageDialog
                          mode="edit"
                          initial={r}
                          onSave={(values) => handleUpdate(r.code, values)}
                          trigger={
                            <button className="text-sm font-medium text-brand hover:underline">
                              Edit
                            </button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-sm font-medium text-muted-foreground hover:text-destructive hover:underline">
                              Delete
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{r.discount}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the usage record. This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => handleDelete(r.code, r.discount)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoading && filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      Loading usage data…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      No usage data matches your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <EntriesFooter
            total={filtered.length}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
