import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { useStockInward } from "@/hooks/use-inventory";

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
];

function Page() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useStockInward(search);

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
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
