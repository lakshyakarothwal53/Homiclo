import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { useCategories } from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/categories")({
  head: () => ({
    meta: [
      { title: "Categories — HOMIQLO" },
      { name: "description", content: "Organize products into categories." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "category", label: "Category" },
  { key: "products", label: "Products" },
  { key: "value", label: "Stock Value" },
  { key: "updated", label: "Last Updated" },
  { key: "action", label: "", align: "right" },
];

function Page() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useCategories(search);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Categories"
        description="Categories overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories…"
      />
      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((c) => (
          <TableRow key={c.name} className="border-t border-border">
            <TableCell className="px-5 py-3 font-medium">{c.name}</TableCell>
            <TableCell className="px-5 py-3">{c.productCount}</TableCell>
            <TableCell className="px-5 py-3">{c.stockValue}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{c.lastUpdated}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              <button className="text-sm font-medium text-brand hover:underline">Edit</button>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
