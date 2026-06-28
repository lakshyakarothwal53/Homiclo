import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { InventoryStatusBadge } from "@/components/inventory/InventoryStatusBadge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useLowStockAlerts } from "@/hooks/use-inventory";

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
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useLowStockAlerts(search);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Low Stock Alerts"
        description="Alerts overview and controls."
      />
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search alerts…" />
      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((r) => (
          <TableRow key={r.sku} className="border-t border-border">
            <TableCell className="px-5 py-3 font-mono text-xs">{r.sku}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.currentStock}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.minLevel}</TableCell>
            <TableCell className="px-5 py-3">
              <InventoryStatusBadge status={r.status} />
            </TableCell>
            <TableCell className="px-5 py-3 text-right">
              <Button
                size="sm"
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => toast.success(`Reorder raised for ${r.product}`)}
              >
                Reorder
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
