import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, IndianRupee, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { DiscountToolbar } from "@/components/discounts/DiscountToolbar";
import { formatCurrency } from "@/components/discounts/types";
import { exportToExcel } from "@/lib/export";
import { useDiscountUsage } from "@/hooks/use-discounts";

const PAGE_SIZE = 8;

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

  const { data: usage = [] } = useDiscountUsage();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usage;
    return usage.filter(
      (r) => r.discount.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  }, [query, usage]);

  const totals = useMemo(() => {
    const used = usage.reduce((s, r) => s + r.timesUsed, 0);
    const given = usage.reduce((s, r) => s + r.discountGiven, 0);
    const conv = usage.length ? usage.reduce((s, r) => s + r.conversion, 0) / usage.length : 0;
    return { used, given, conv: Math.round(conv) };
  }, [usage]);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage((p) => Math.min(Math.max(1, p), pageCount)), [pageCount]);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function handleExport() {
    exportToExcel(
      "discount-usage-reports",
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
        date={date}
        onDate={setDate}
        onExport={handleExport}
        addLabel="Add New"
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
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
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
                  </tr>
                ))}
                {filtered.length === 0 && (
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
            firstShown={filtered.length === 0 ? 0 : start + 1}
            lastShown={Math.min(start + PAGE_SIZE, filtered.length)}
            total={filtered.length}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
