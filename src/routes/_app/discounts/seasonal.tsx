import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DiscountToolbar } from "@/components/discounts/DiscountToolbar";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import { downloadCsv, type DiscountStatus } from "@/components/discounts/types";

export const Route = createFileRoute("/_app/discounts/seasonal")({
  head: () => ({
    meta: [
      { title: "Seasonal Offers — HOMIQLO" },
      { name: "description", content: "Festival and seasonal promotions." },
    ],
  }),
  component: Page,
});

type SeasonRow = {
  season: string;
  offer: string;
  discount: string;
  validFrom: string;
  validTo: string;
  status: DiscountStatus;
};

const seasons: SeasonRow[] = [
  {
    season: "Diwali",
    offer: "Festive Bonanza",
    discount: "Up to 30%",
    validFrom: "01 Nov",
    validTo: "15 Nov",
    status: "Active",
  },
  {
    season: "Black Friday",
    offer: "Mega Sale",
    discount: "Up to 50%",
    validFrom: "29 Nov",
    validTo: "30 Nov",
    status: "Upcoming",
  },
  {
    season: "Christmas",
    offer: "Holiday Deals",
    discount: "20%",
    validFrom: "20 Dec",
    validTo: "26 Dec",
    status: "Upcoming",
  },
  {
    season: "New Year",
    offer: "Year-End Clearance",
    discount: "Up to 40%",
    validFrom: "27 Dec",
    validTo: "02 Jan",
    status: "Upcoming",
  },
];

function Page() {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All Branches");
  const [date, setDate] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seasons;
    return seasons.filter(
      (r) => r.season.toLowerCase().includes(q) || r.offer.toLowerCase().includes(q),
    );
  }, [query]);

  function handleExport() {
    downloadCsv(
      "seasonal-offers.csv",
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
                {filtered.map((r) => (
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
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : 1}–{filtered.length} of {filtered.length} entries
          </div>
        </CardContent>
      </Card>
    </>
  );
}
