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
import { TableCell, TableRow } from "@/components/ui/table";
import {
  useBranches,
  useCreateStockInward,
  useDeleteStockInward,
  useStockInward,
  useUpdateStockInward,
} from "@/hooks/use-inventory";
import type { StockInwardEntry } from "@/types/inventory";

export const Route = createFileRoute("/_app/inventory/stock-inward")({
  head: () => ({
    meta: [
      { title: "Stock Inward — HOMIQLO" },
      { name: "description", content: "Record new shipments received." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "date", label: "Date" },
  { key: "grn", label: "GRN #" },
  { key: "product", label: "Product" },
  { key: "supplier", label: "Supplier" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "cost", label: "Cost", align: "right" },
  { key: "receivedBy", label: "Received By" },
  { key: "action", label: "", align: "right" },
];

const FIELDS: EntityField[] = [
  { key: "grn", label: "GRN #", required: true, placeholder: "GRN-2401" },
  { key: "date", label: "Date", placeholder: "12 Nov" },
  { key: "product", label: "Product", required: true, placeholder: "Cotton T-Shirt (L)" },
  { key: "supplier", label: "Supplier", placeholder: "Maxwell Textiles" },
  { key: "qty", label: "Qty", type: "number", placeholder: "100" },
  { key: "cost", label: "Cost", placeholder: "₹35,000" },
  { key: "receivedBy", label: "Received By", placeholder: "A. Verma" },
];

function toEntry(v: EntityValues): StockInwardEntry {
  return {
    grn: String(v.grn),
    date: String(v.date),
    product: String(v.product),
    supplier: String(v.supplier),
    qty: Number(v.qty) || 0,
    cost: String(v.cost),
    receivedBy: String(v.receivedBy),
  };
}

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading } = useStockInward(search, branch);
  const { data: branches = [] } = useBranches();

  const createEntry = useCreateStockInward();
  const updateEntry = useUpdateStockInward();
  const deleteEntry = useDeleteStockInward();

  function handleCreate(v: EntityValues) {
    const row = toEntry(v);
    createEntry.mutate(row, {
      onSuccess: () => toast.success(`${row.grn} created.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create entry."),
    });
  }

  function handleUpdate(originalGrn: string, v: EntityValues) {
    const row = toEntry(v);
    updateEntry.mutate(
      { ...row, originalGrn },
      {
        onSuccess: () => toast.success(`${row.grn} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update entry."),
      },
    );
  }

  function handleDelete(grn: string) {
    deleteEntry.mutate(grn, {
      onSuccess: () => toast.success(`${grn} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete entry."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Inward"
        description="Stock Inward overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search GRN or product…"
        primaryLabel="Add New"
        onPrimary={() => setAddOpen(true)}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />

      <EntityFormDialog
        mode="add"
        title="Add Stock Inward"
        description="Record a new goods-received entry."
        fields={FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleCreate}
      />

      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((r) => (
          <TableRow key={r.grn} className="border-t border-border">
            <TableCell className="px-5 py-3 whitespace-nowrap">{r.date}</TableCell>
            <TableCell className="px-5 py-3 font-mono text-xs">{r.grn}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.supplier}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.qty}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.cost}</TableCell>
            <TableCell className="px-5 py-3">{r.receivedBy}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <EntityFormDialog
                  mode="edit"
                  title="Edit Stock Inward"
                  fields={FIELDS}
                  initial={r}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                  onSave={(v) => handleUpdate(r.grn, v)}
                />
                <DeleteConfirm label={r.grn} onConfirm={() => handleDelete(r.grn)} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
