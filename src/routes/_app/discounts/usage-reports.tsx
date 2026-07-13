import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Download, Eye, IndianRupee, Tag } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DiscountToolbar } from "@/components/discounts/DiscountToolbar";
import { downloadCsv, formatCurrency } from "@/components/discounts/types";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { useDiscountBranches, useDiscountUsage } from "@/hooks/use-discounts";
import { buildUsageReportPdf, downloadPdf, openPdf } from "@/lib/pdf-utils";
import type { DiscountUsageRow } from "@/types/discounts";

export const Route = createFileRoute("/_app/discounts/usage-reports")({
  head: () => ({
    meta: [
      { title: "Usage Reports — HOMIQLO" },
      { name: "description", content: "Discount redemption analytics." },
    ],
  }),
  component: Page,
});

function handleView(row: DiscountUsageRow) {
  openPdf(buildUsageReportPdf(row, row.transactions));
}

function handleDownload(row: DiscountUsageRow) {
  downloadPdf(buildUsageReportPdf(row, row.transactions), `${row.code}-usage-report.pdf`);
}

function Page() {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All Branches");

  const { data: usage = [], isLoading } = useDiscountUsage(branch);
  const { data: branches = [] } = useDiscountBranches();

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
    return { used, given, codes: usage.length };
  }, [usage]);

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "discount-usage-reports.csv",
      ["Discount", "Code", "Times Used", "Discount Given", "Avg. Order"],
      filtered.map((r) => [
        r.discount,
        r.code,
        r.timesUsed,
        formatCurrency(r.discountGiven),
        formatCurrency(r.avgOrder),
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
          hint="Across all redemptions"
          icon={IndianRupee}
        />
        <StatCard label="Codes Used" value={String(totals.codes)} hint="Distinct codes redeemed" icon={Tag} />
      </div>

      <DiscountToolbar
        query={query}
        onQuery={setQuery}
        branch={branch}
        onBranch={setBranch}
        branches={branches}
        onExport={handleExport}
        showAdd={false}
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
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleView(r)}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleDownload(r)}
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoading && filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      Loading usage data…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={6}
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
