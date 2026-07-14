import { useMemo, useState } from "react";
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
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { usePagination } from "@/hooks/use-pagination";
import { DiscountToolbar } from "./DiscountToolbar";
import { AddDiscountDialog } from "./AddDiscountDialog";
import { StatusBadge } from "./StatusBadge";
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  formatTargets,
  formatValue,
  type DiscountTargetType,
  type DiscountValueType,
  type PromoRow,
} from "./types";
import {
  useDiscountBranches,
  useDiscountPromos,
  useCreateDiscountPromo,
  useUpdateDiscountPromo,
  useDeleteDiscountPromo,
} from "@/hooks/use-discounts";

export function PromoDiscountsPage({
  eyebrow,
  title,
  description,
  addLabel,
  lockType,
  discountType,
}: {
  eyebrow: string;
  title: string;
  description: string;
  addLabel: string;
  /** Flat / Percentage pages fix the value type for new rows. */
  lockType?: DiscountValueType;
  /** 'flat' | 'percentage' | 'category' | 'product' — matches discount_promos.discount_type. */
  discountType: string;
}) {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All Branches");
  const [date, setDate] = useState("");

  // Product / Category pages fix what the discount targets; Flat / Percentage let the user choose.
  const lockTarget: DiscountTargetType | undefined =
    discountType === "product" ? "product" : discountType === "category" ? "category" : undefined;

  const { data: rows = [], isLoading } = useDiscountPromos(discountType, branch);
  const { data: branches = [] } = useDiscountBranches();

  const createPromo = useCreateDiscountPromo();
  const updatePromo = useUpdateDiscountPromo();
  const deletePromo = useDeleteDiscountPromo();

  function handleCreate(row: PromoRow) {
    createPromo.mutate(
      { ...row, discountType },
      {
        onSuccess: () => toast.success(`${row.name} created.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create discount."),
      },
    );
  }

  function handleUpdate(row: PromoRow) {
    updatePromo.mutate(
      { ...row, discountType },
      {
        onSuccess: () => toast.success(`${row.name} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update discount."),
      },
    );
  }

  function handleDelete(row: PromoRow) {
    deletePromo.mutate(row.id, {
      onSuccess: () => toast.success(`${row.name} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete discount."),
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) {
        return false;
      }
      if (date) {
        const on = new Date(date).getTime();
        if (on < new Date(r.validFrom).getTime() || on > new Date(r.validTo).getTime()) {
          return false;
        }
      }
      return true;
    });
  }, [rows, query, date]);

  const { page, setPage, totalPages, pageItems } = usePagination(filtered);

  function handleExport() {
    downloadCsv(
      `${title.toLowerCase().replace(/\s+/g, "-")}.csv`,
      [
        "Name",
        "Code",
        "Applies To",
        "Value",
        "Min Order",
        "Valid From",
        "Valid To",
        "Used",
        "Status",
      ],
      filtered.map((r) => [
        r.name,
        r.code,
        formatTargets(r),
        formatValue(r),
        r.minOrder,
        formatDate(r.validFrom),
        formatDate(r.validTo),
        r.used,
        r.status,
      ]),
    );
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

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
          <AddDiscountDialog
            mode="add"
            triggerLabel={addLabel}
            title={addLabel}
            lockType={lockType}
            lockTarget={lockTarget}
            onSubmit={handleCreate}
          />
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Applies To</th>
                  <th className="px-5 py-3 text-left font-medium">Value</th>
                  <th className="px-5 py-3 text-left font-medium">Min Order</th>
                  <th className="px-5 py-3 text-left font-medium">Valid From</th>
                  <th className="px-5 py-3 text-left font-medium">Valid To</th>
                  <th className="px-5 py-3 text-left font-medium">Used</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {r.code}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatTargets(r)}</td>
                    <td className="px-5 py-3.5">{formatValue(r)}</td>
                    <td className="px-5 py-3.5">{formatCurrency(r.minOrder)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(r.validFrom)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(r.validTo)}</td>
                    <td className="px-5 py-3.5">
                      {r.used}
                      {r.cap != null && <span className="text-muted-foreground"> / {r.cap}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <AddDiscountDialog
                          mode="edit"
                          title={`Edit ${r.name}`}
                          lockType={lockType}
                          lockTarget={lockTarget}
                          initial={r}
                          onSubmit={handleUpdate}
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
                              <AlertDialogTitle>Delete “{r.name}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the discount. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => handleDelete(r)}
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
                      colSpan={10}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      Loading discounts…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={10}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      No discounts match your filters.
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
