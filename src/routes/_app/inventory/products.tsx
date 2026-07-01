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
import { priceInRange, type PriceRange, type PriceSort } from "@/components/inventory/price-filter";
import { InventoryStatusBadge } from "@/components/inventory/InventoryStatusBadge";
import { TableCell, TableRow } from "@/components/ui/table";
import { exportToExcel } from "@/lib/export";
import {
  useBranches,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/use-inventory";
import type { Product } from "@/types/inventory";

export const Route = createFileRoute("/_app/inventory/products")({
  head: () => ({
    meta: [
      { title: "Products — HOMIQLO" },
      { name: "description", content: "Manage your full product catalog." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "sku", label: "SKU" },
  { key: "product", label: "Product" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", align: "right" },
  { key: "stock", label: "Stock", align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "", align: "right" },
];

const FIELDS: EntityField[] = [
  { key: "sku", label: "SKU", required: true, placeholder: "SKU-1001" },
  { key: "name", label: "Product", required: true, placeholder: "Cotton T-Shirt (L)" },
  { key: "category", label: "Category", required: true, placeholder: "Apparel" },
  { key: "price", label: "Price (₹)", type: "number", placeholder: "499" },
  { key: "stock", label: "Stock", type: "number", placeholder: "100" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["In Stock", "Low Stock", "Out of Stock"],
    required: true,
  },
];

function toProduct(v: EntityValues): Product {
  return {
    sku: String(v.sku),
    name: String(v.name),
    category: String(v.category),
    price: Number(v.price) || 0,
    stock: Number(v.stock) || 0,
    status: v.status as Product["status"],
  };
}

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading } = useProducts(search, branch);
  const { data: branches = [] } = useBranches();

  const rows = data
    .filter((p) => priceInRange(p.price, priceRange))
    .sort((a, b) => {
      if (priceSort === "low") return a.price - b.price;
      if (priceSort === "high") return b.price - a.price;
      return 0;
    });

  function handleExport() {
    exportToExcel(
      "products",
      ["SKU", "Product", "Category", "Price", "Stock", "Status"],
      rows.map((p) => [p.sku, p.name, p.category, p.price, p.stock, p.status]),
    );
  }

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function handleCreate(v: EntityValues) {
    const row = toProduct(v);
    createProduct.mutate(row, {
      onSuccess: () => toast.success(`${row.name} created.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create product."),
    });
  }

  function handleUpdate(originalSku: string, v: EntityValues) {
    const row = toProduct(v);
    updateProduct.mutate(
      { ...row, originalSku },
      {
        onSuccess: () => toast.success(`${row.name} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update product."),
      },
    );
  }

  function handleDelete(sku: string) {
    deleteProduct.mutate(sku, {
      onSuccess: () => toast.success(`${sku} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete product."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description="Products overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        primaryLabel="Add New"
        onPrimary={() => setAddOpen(true)}
        onExport={handleExport}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
        priceSort={priceSort}
        onPriceSortChange={setPriceSort}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
      />

      <EntityFormDialog
        mode="add"
        title="Add Product"
        description="Create a new product in the catalog."
        fields={FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleCreate}
      />

      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={rows.length}>
        {rows.map((p) => (
          <TableRow key={p.sku} className="border-t border-border">
            <TableCell className="px-5 py-3 font-mono text-xs">{p.sku}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{p.name}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{p.category}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              ₹{p.price.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="px-5 py-3 text-right">{p.stock}</TableCell>
            <TableCell className="px-5 py-3">
              <InventoryStatusBadge status={p.status} />
            </TableCell>
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <EntityFormDialog
                  mode="edit"
                  title="Edit Product"
                  fields={FIELDS}
                  initial={p}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                  onSave={(v) => handleUpdate(p.sku, v)}
                />
                <DeleteConfirm label={p.sku} onConfirm={() => handleDelete(p.sku)} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
