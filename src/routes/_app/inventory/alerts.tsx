import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { DeleteConfirm } from "@/components/inventory/DeleteConfirm";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { FilterBar } from "@/components/inventory/FilterBar";
import { InventoryStatusBadge } from "@/components/inventory/InventoryStatusBadge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBranches,
  useDeleteLowStockAlert,
  useLowStockAlerts,
  useUpdateLowStockAlert,
} from "@/hooks/use-inventory";
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

const FIELDS: EntityField[] = [
  { key: "sku", label: "SKU", required: true, placeholder: "SKU-1001" },
  { key: "product", label: "Product", required: true, placeholder: "Cotton T-Shirt (L)" },
  { key: "currentStock", label: "Current Stock", type: "number", placeholder: "4" },
  { key: "minLevel", label: "Min Level", type: "number", placeholder: "10" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Critical", "Low"],
    required: true,
  },
];

function toAlert(v: EntityValues): LowStockAlert {
  return {
    sku: String(v.sku),
    product: String(v.product),
    currentStock: Number(v.currentStock) || 0,
    minLevel: Number(v.minLevel) || 0,
    status: v.status as LowStockAlert["status"],
  };
}

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data = [], isLoading } = useLowStockAlerts(search, branch);
  const { data: branches = [] } = useBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(data);

  const updateAlert = useUpdateLowStockAlert();
  const deleteAlert = useDeleteLowStockAlert();

  function handleUpdate(originalSku: string, v: EntityValues) {
    const row = toAlert(v);
    updateAlert.mutate(
      { ...row, originalSku },
      {
        onSuccess: () => toast.success(`${row.sku} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update alert."),
      },
    );
  }

  function handleDelete(sku: string) {
    deleteAlert.mutate(sku, {
      onSuccess: () => toast.success(`${sku} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete alert."),
    });
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
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
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
                  onClick={() => toast.success(`Reorder raised for ${r.product}`)}
                >
                  Reorder
                </Button>
                <EntityFormDialog
                  mode="edit"
                  title="Edit Low Stock Alert"
                  fields={FIELDS}
                  initial={r}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                  onSave={(v) => handleUpdate(r.sku, v)}
                />
                <DeleteConfirm label={r.sku} onConfirm={() => handleDelete(r.sku)} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
