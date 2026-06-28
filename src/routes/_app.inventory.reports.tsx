import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { useInventoryReports } from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/reports")({
  head: () => ({
    meta: [
      { title: "Inventory Reports — HOMIQLO" },
      { name: "description", content: "Valuation, turnover and aging reports." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "report", label: "Report" },
  { key: "period", label: "Period" },
  { key: "generated", label: "Generated" },
  { key: "format", label: "Format" },
  { key: "action", label: "", align: "right" },
];

function Page() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useInventoryReports(search);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Inventory Reports"
        description="Reports overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reports…"
        primaryLabel="Generate"
      />
      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((r) => (
          <TableRow key={r.report} className="border-t border-border">
            <TableCell className="px-5 py-3 font-medium">{r.report}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.period}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.generated}</TableCell>
            <TableCell className="px-5 py-3">
              <Badge variant="secondary">{r.format}</Badge>
            </TableCell>
            <TableCell className="px-5 py-3 text-right">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => toast.success(`Downloading "${r.report}"`)}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
