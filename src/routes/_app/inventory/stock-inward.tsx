import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { DeleteConfirm } from "@/components/inventory/DeleteConfirm";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBranches,
  useCreateStockInward,
  useDeleteStockInward,
  useStockInward,
  useUpdateStockInward,
  useProducts,
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
  { key: "unitCost", label: "Unit Cost", align: "right" },
  { key: "totalCost", label: "Total Cost", align: "right" },
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
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading } = useStockInward(search, branch);
  const { data: products = [] } = useProducts(undefined, branch);
  const { data: branches = [] } = useBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(data);

  const productMap = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);

  const summary = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    data.forEach((entry) => {
      const product = productMap.get(entry.product);
      totalQty += entry.qty || 0;
      const cost = parseFloat(entry.cost) || 0;
      totalValue += cost;
    });
    return { totalQty, totalValue };
  }, [data, productMap]);

  const createEntry = useCreateStockInward();
  const updateEntry = useUpdateStockInward();
  const deleteEntry = useDeleteStockInward();

  function handleCreate(v: EntityValues) {
    const row = toEntry(v);
    createEntry.mutate(
      { ...row, branch },
      {
        onSuccess: () => toast.success(`${row.grn} created.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create entry."),
      },
    );
  }

  function handleUpdate(originalGrn: string, v: EntityValues) {
    const row = toEntry(v);
    updateEntry.mutate(
      { ...row, originalGrn, branch },
      {
        onSuccess: () => toast.success(`${row.grn} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update entry."),
      },
    );
  }

  function handleDelete(grn: string) {
    deleteEntry.mutate(
      { grn, branch },
      {
        onSuccess: () => toast.success(`${grn} deleted.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete entry."),
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Inward"
        description="Stock Inward overview and controls."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        <StatCard label="Total Units Received" value={summary.totalQty} icon={Package} />
        <StatCard
          label="Total Cost Value"
          value={`₹${summary.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search GRN or product…"
        primaryLabel="Add New"
        onPrimary={() => setAddOpen(true)}
        {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
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

      <DataTableCard
        columns={COLUMNS}
        isLoading={isLoading}
        count={data.length}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {pageItems.map((r) => {
          const unitCost = r.qty ? (parseFloat(r.cost) || 0) / r.qty : 0;
          const totalCost = parseFloat(r.cost) || 0;
          return (
            <TableRow key={r.grn} className="border-t border-border">
              <TableCell className="px-5 py-3 whitespace-nowrap">{r.date}</TableCell>
              <TableCell className="px-5 py-3 font-mono text-xs">{r.grn}</TableCell>
              <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
              <TableCell className="px-5 py-3 text-muted-foreground">{r.supplier}</TableCell>
              <TableCell className="px-5 py-3 text-right">{r.qty}</TableCell>
              <TableCell className="px-5 py-3 text-right">
                ₹{unitCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className="px-5 py-3 text-right">
                ₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </TableCell>
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
          );
        })}
      </DataTableCard>
    </>
  );
}
