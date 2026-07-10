import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
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
import { SeasonalDialog } from "@/components/discounts/SeasonalDialog";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import { downloadCsv } from "@/components/discounts/types";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { parseRowDate } from "@/lib/report-data";
import {
  useDiscountBranches,
  useDiscountSeasonal,
  useCreateSeasonal,
  useUpdateSeasonal,
  useDeleteSeasonal,
} from "@/hooks/use-discounts";
import type { DiscountSeasonInput } from "@/types/discounts";

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

  const { data: seasons = [], isLoading } = useDiscountSeasonal(branch);
  const { data: branches = [] } = useDiscountBranches();

  const createSeasonal = useCreateSeasonal();
  const updateSeasonal = useUpdateSeasonal();
  const deleteSeasonal = useDeleteSeasonal();

  function handleCreate(values: DiscountSeasonInput) {
    createSeasonal.mutate(values, {
      onSuccess: () => toast.success(`${values.season} created.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create offer."),
    });
  }

  function handleUpdate(originalSeason: string, values: DiscountSeasonInput) {
    updateSeasonal.mutate(
      { ...values, originalSeason },
      {
        onSuccess: () => toast.success(`${values.season} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update offer."),
      },
    );
  }

  function handleDelete(season: string) {
    deleteSeasonal.mutate(season, {
      onSuccess: () => toast.success(`${season} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete offer."),
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seasons.filter((r) => {
      if (q && !r.season.toLowerCase().includes(q) && !r.offer.toLowerCase().includes(q)) {
        return false;
      }
      if (date) {
        const on = new Date(date).getTime();
        const from = parseRowDate(r.validFrom);
        const to = parseRowDate(r.validTo);
        if (from && to && (on < from.getTime() || on > to.getTime())) return false;
      }
      return true;
    });
  }, [query, date, seasons]);

  const { page, setPage, totalPages, pageItems } = usePagination(filtered);

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
        branches={branches}
        date={date}
        onDate={setDate}
        onExport={handleExport}
        addSlot={<SeasonalDialog mode="add" onSave={handleCreate} />}
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
                  <th className="px-5 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.season} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.season}</td>
                    <td className="px-5 py-3.5">{r.offer}</td>
                    <td className="px-5 py-3.5">{r.discount}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.validFrom}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.validTo}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <SeasonalDialog
                          mode="edit"
                          initial={r}
                          onSave={(values) => handleUpdate(r.season, values)}
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
                              <AlertDialogTitle>Delete “{r.season}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the seasonal offer. This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => handleDelete(r.season)}
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
                      Loading offers…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={7}
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
