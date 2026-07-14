import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { InventoryStatusBadge } from "@/components/inventory/InventoryStatusBadge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import { useBranches, useLowStockAlerts } from "@/hooks/use-inventory";
import type { LowStockAlert } from "@/types/inventory";

export const Route = createFileRoute("/_app/inventory/alerts")({
  head: () => ({
    meta: [
      { title: "Low Stock Alerts — HOMIQLO" },
      { name: "description", content: "Products approaching their reorder threshold." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "sku", label: "SKU" },
  { key: "product", label: "Product" },
  { key: "current", label: "Current Stock", align: "right" },
  { key: "min", label: "Min Level", align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" },
];

function Page() {
  const router = useRouter();
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const { data = [], isLoading } = useLowStockAlerts(search, branch);
  const { data: branches = [] } = useBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(data);

  // Alerts are derived from products (stock < min_stock) — they aren't
  // hand-edited, so there's no add/edit/delete here. The only action is to
  // reorder, which routes to the stock-inward form (qty/supplier/cost aren't
  // knowable from the alert row alone) rather than faking the action here.
  function handleReorder(alert: LowStockAlert) {
    toast.info(`Create a stock-inward entry for ${alert.product} (${alert.sku}).`);
    router.navigate({ to: "/inventory/stock-inward" });
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Low Stock Alerts"
        description="Alerts overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search alerts…"
        {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
      />

      <DataTableCard
        columns={COLUMNS}
        isLoading={isLoading}
        count={data.length}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {pageItems.map((r) => (
          <TableRow key={r.sku} className="border-t border-border">
            <TableCell className="px-5 py-3 font-mono text-xs">{r.sku}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.currentStock}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.minLevel}</TableCell>
            <TableCell className="px-5 py-3">
              <InventoryStatusBadge status={r.status} />
            </TableCell>
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <Button
                  size="sm"
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={() => handleReorder(r)}
                >
                  Reorder
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
