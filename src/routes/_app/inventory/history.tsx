import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { exportToExcel } from "@/lib/export";
import { cn } from "@/lib/utils";
import { useBranches, useStockHistory } from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/history")({
  head: () => ({
    meta: [
      { title: "Stock History — HOMIQLO" },
      { name: "description", content: "Movement of every SKU over time." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "date", label: "Date" },
  { key: "product", label: "Product" },
  { key: "change", label: "Change", align: "right" },
  { key: "type", label: "Type" },
  { key: "balance", label: "Balance", align: "right" },
  { key: "by", label: "By" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data = [], isLoading } = useStockHistory(search, branch);
  const { data: branches = [] } = useBranches();

  function handleExport() {
    exportToExcel(
      "stock-history",
      ["Date", "Product", "Change", "Type", "Balance", "By"],
      data.map((r) => [r.datetime, r.product, r.change, r.type, r.balance, r.by]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock History"
        description="History overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search product…"
        onExport={handleExport}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((r, i) => (
          <TableRow key={`${r.datetime}-${i}`} className="border-t border-border">
            <TableCell className="px-5 py-3 whitespace-nowrap text-muted-foreground">
              {r.datetime}
            </TableCell>
            <TableCell className="px-5 py-3 font-medium">{r.product}</TableCell>
            <TableCell
              className={cn(
                "px-5 py-3 text-right font-medium",
                r.change >= 0 ? "text-[color:var(--success)]" : "text-brand",
              )}
            >
              {r.change > 0 ? `+${r.change}` : r.change}
            </TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.type}</TableCell>
            <TableCell className="px-5 py-3 text-right">{r.balance}</TableCell>
            <TableCell className="px-5 py-3">{r.by}</TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
