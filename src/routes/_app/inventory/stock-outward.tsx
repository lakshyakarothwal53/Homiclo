import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, AlertTriangle, Zap } from "lucide-react";

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
  useCreateStockOutward,
  useDeleteStockOutward,
  useStockOutward,
  useUpdateStockOutward,
  useProducts,
} from "@/hooks/use-inventory";
import type { StockOutwardEntry } from "@/types/inventory";

export const Route = createFileRoute("/_app/inventory/stock-outward")({
  head: () => ({
    meta: [
      { title: "Stock Outward — HOMIQLO" },
      { name: "description", content: "Track outbound transfers and dispatches." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "date", label: "Date" },
  { key: "ref", label: "Out #" },
  { key: "product", label: "Product" },
  { key: "type", label: "Type" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "value", label: "Est. Value", align: "right" },
  { key: "reference", label: "Reference" },
  { key: "by", label: "By" },
  { key: "action", label: "", align: "right" },
];

const FIELDS: EntityField[] = [
  { key: "ref", label: "Out #", required: true, placeholder: "OUT-1201" },
  { key: "date", label: "Date", placeholder: "12 Nov" },
  { key: "product", label: "Product", required: true, placeholder: "Cotton T-Shirt (L)" },
  {
    key: "type",
    label: "Type",
    type: "select",
    options: ["Sale", "Damage", "Transfer"],
    required: true,
  },
  { key: "qty", label: "Qty", type: "number", placeholder: "8" },
  { key: "reference", label: "Reference", placeholder: "INV-10248" },
  { key: "by", label: "By", placeholder: "R. Kapoor" },
];

function toEntry(v: EntityValues): StockOutwardEntry {
  return {
    ref: String(v.ref),
    date: String(v.date),
    product: String(v.product),
    type: v.type as StockOutwardEntry["type"],
    qty: Number(v.qty) || 0,
    reference: String(v.reference),
    by: String(v.by),
  };
}

function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading } = useStockOutward(search, branch);
  const { data: products = [] } = useProducts(undefined, branch);
  const { data: branches = [] } = useBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(data);

  const productMap = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);

  const summary = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let salesQty = 0;
    let damageQty = 0;
    let theftQty = 0;

    data.forEach((entry) => {
      const product = productMap.get(entry.product);
      const price = product?.price || 0;
      totalQty += entry.qty || 0;
      totalValue += (entry.qty || 0) * price;

      if (entry.type === "Sale") salesQty += entry.qty || 0;
      if (entry.type === "Damage") damageQty += entry.qty || 0;
      if (entry.type === "Transfer") theftQty += entry.qty || 0;
    });

    return { totalQty, totalValue, salesQty, damageQty, theftQty };
  }, [data, productMap]);

  const createEntry = useCreateStockOutward();
  const updateEntry = useUpdateStockOutward();
  const deleteEntry = useDeleteStockOutward();

  function handleCreate(v: EntityValues) {
    const row = toEntry(v);
    createEntry.mutate(
      { ...row, branch },
      {
        onSuccess: () => toast.success(`${row.ref} created.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create entry."),
      },
    );
  }

  function handleUpdate(originalRef: string, v: EntityValues) {
    const row = toEntry(v);
    updateEntry.mutate(
      { ...row, originalRef, branch },
      {
        onSuccess: () => toast.success(`${row.ref} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update entry."),
      },
    );
  }

  function handleDelete(ref: string) {
    deleteEntry.mutate(
      { ref, branch },
      {
        onSuccess: () => toast.success(`${ref} deleted.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete entry."),
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Outward"
        description="Stock Outward overview and controls."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Total Units Out" value={summary.totalQty} icon={ShoppingCart} />
        <StatCard label="Sales" value={summary.salesQty} icon={ShoppingCart} />
        <StatCard label="Damage/Loss" value={summary.damageQty} icon={AlertTriangle} />
        <StatCard label="Transfers" value={summary.theftQty} icon={Zap} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ref or product…"
        primaryLabel="Add New"
        onPrimary={() => setAddOpen(true)}
        {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
      />

      <EntityFormDialog
        mode="add"
        title="Add Stock Outward"
        description="Record a new outbound entry."
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
          const product = productMap.get(r.product);
          const value = (r.qty || 0) * (product?.price || 0);
          return (
            <TableRow key={r.ref} className="border-t border-border">
              <TableCell className="px-5 py-3 whitespace-nowrap">{r.date}</TableCell>
              <TableCell className="px-5 py-3 font-mono text-xs">{r.ref}</TableCell>
              <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
              <TableCell className="px-5 py-3 text-muted-foreground">{r.type}</TableCell>
              <TableCell className="px-5 py-3 text-right">{r.qty}</TableCell>
              <TableCell className="px-5 py-3 text-right">
                ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className="px-5 py-3 font-mono text-xs">{r.reference}</TableCell>
              <TableCell className="px-5 py-3">{r.by}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <EntityFormDialog
                  mode="edit"
                  title="Edit Stock Outward"
                  fields={FIELDS}
                  initial={r}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                  onSave={(v) => handleUpdate(r.ref, v)}
                />
                <DeleteConfirm label={r.ref} onConfirm={() => handleDelete(r.ref)} />
              </div>
            </TableCell>
            </TableRow>
          );
        })}
      </DataTableCard>
    </>
  );
}
