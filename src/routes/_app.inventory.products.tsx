import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { InventoryStatusBadge } from "@/components/inventory/InventoryStatusBadge";
import { TableCell, TableRow } from "@/components/ui/table";
import { useProducts } from "@/hooks/use-inventory";

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

function Page() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useProducts(search);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description="Products overview and controls."
      />
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search products…" />
      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((p) => (
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
              <button className="text-sm font-medium text-brand hover:underline">Edit</button>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
