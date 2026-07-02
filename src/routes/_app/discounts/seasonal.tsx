import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { DiscountToolbar } from "@/components/discounts/DiscountToolbar";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import { exportToExcel } from "@/lib/export";
import { useDiscountBranches, useDiscountSeasonal } from "@/hooks/use-discounts";

const PAGE_SIZE = 8;

export const Route = createFileRoute("/_app/discounts/seasonal")({
  head: () => ({
    meta: [
      { title: "Seasonal Offers — HOMIQLO" },
      { name: "description", content: "Festival and seasonal promotions." },
    ],
  }),
  component: Page,
});

function Page() {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All Branches");
  const [date, setDate] = useState("");

  const { data: seasons = [] } = useDiscountSeasonal(branch);
  const { data: branches = [] } = useDiscountBranches();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seasons;
    return seasons.filter(
      (r) => r.season.toLowerCase().includes(q) || r.offer.toLowerCase().includes(q),
    );
  }, [query, seasons]);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage((p) => Math.min(Math.max(1, p), pageCount)), [pageCount]);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function handleExport() {
    exportToExcel(
      "seasonal-offers",
      ["Season", "Offer", "Discount", "Valid From", "Valid To", "Status"],
      filtered.map((r) => [r.season, r.offer, r.discount, r.validFrom, r.validTo, r.status]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Discounts › Seasonal"
        title="Seasonal Offers"
        description="Seasonal overview and controls."
      />

      <DiscountToolbar
        query={query}
        onQuery={setQuery}
        branch={branch}
        onBranch={setBranch}
        branches={branches}
        date={date}
        onDate={setDate}
        onExport={handleExport}
        addSlot={
          <Button
            size="sm"
            className="h-9 gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => toast.info("Seasonal offer scheduling opens here.")}
          >
            <Plus className="h-4 w-4" /> Add New
          </Button>
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Season</th>
                  <th className="px-5 py-3 text-left font-medium">Offer</th>
                  <th className="px-5 py-3 text-left font-medium">Discount</th>
                  <th className="px-5 py-3 text-left font-medium">Valid From</th>
                  <th className="px-5 py-3 text-left font-medium">Valid To</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.season} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.season}</td>
                    <td className="px-5 py-3.5">{r.offer}</td>
                    <td className="px-5 py-3.5">{r.discount}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.validFrom}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.validTo}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      No offers match your search.
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
