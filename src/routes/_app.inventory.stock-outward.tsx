import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { useStockOutward } from "@/hooks/use-inventory";

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
  { key: "reference", label: "Reference" },
  { key: "by", label: "By" },
];

function Page() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useStockOutward(search);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Outward"
        description="Stock Outward overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ref or product…"
      />
      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((r) => (
          <TableRow key={r.ref} className="border-t border-border">
            <TableCell className="px-5 py-3 whitespace-nowrap">{r.date}</TableCell>
            <TableCell className="px-5 py-3 font-mono text-xs">{r.ref}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.type}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.qty}</TableCell>
            <TableCell className="px-5 py-3 font-mono text-xs">{r.reference}</TableCell>
            <TableCell className="px-5 py-3">{r.by}</TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
