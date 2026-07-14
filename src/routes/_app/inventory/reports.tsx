import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { FilterBar } from "@/components/inventory/FilterBar";
import { PeriodFilter, type PeriodOption } from "@/components/reports/PeriodFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { useBranches, useCreateInventoryReport, useInventoryReports } from "@/hooks/use-inventory";
import { buildTablePdf, downloadCsv, downloadPdf } from "@/lib/pdf-utils";
import { fetchNamedInventoryReport } from "@/lib/report-data";
import type { InventoryReport } from "@/types/inventory";

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

const GENERATE_FIELDS: EntityField[] = [
  { key: "report", label: "Report Name", required: true, placeholder: "Fast Moving Items" },
  { key: "period", label: "Period", required: true, placeholder: "Jul 2026" },
  {
    key: "format",
    label: "Format",
    type: "select",
    options: ["PDF", "Excel"],
    required: true,
  },
];

const longDate = (d: Date) =>
  `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [period, setPeriod] = useState<PeriodOption>({ key: "all", label: "All time" });
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading } = useInventoryReports(search, branch);
  const { data: branches = [] } = useBranches();
  const createReport = useCreateInventoryReport();
  const { page, setPage, totalPages, pageItems } = usePagination(data);

  const opts = () => ({
    from: period.from,
    to: period.to,
    branch: branch === "all" ? undefined : branch,
  });

  async function handleDownload(r: InventoryReport) {
    try {
      const live = await fetchNamedInventoryReport(r.report, opts());
      if (live.rows.length === 0) {
        toast.error("No inventory data available for this period.");
        return;
      }
      const filename = r.report.toLowerCase().replace(/\s+/g, "-");
      const subtitle = period.key === "all" ? r.period : `${r.period} · ${period.label}`;
      if (r.format.toUpperCase() === "PDF") {
        downloadPdf(buildTablePdf({ title: r.report, subtitle, ...live }), filename);
      } else {
        downloadCsv(filename, live.columns, live.rows);
      }
      toast.success(`Downloaded "${r.report}" (${r.format}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate report.");
    }
  }

  async function handleExport() {
    try {
      const live = await fetchNamedInventoryReport("Stock Valuation Report", opts());
      if (live.rows.length === 0) {
        toast.error("No inventory data to export.");
        return;
      }
      downloadCsv("inventory-export", live.columns, live.rows);
      toast.success(`Exported ${live.rows.length} products.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    }
  }

  function handleGenerate(v: EntityValues) {
    createReport.mutate(
      {
        report: String(v.report),
        period: String(v.period),
        generated: longDate(new Date()),
        format: v.format === "Excel" ? "Excel" : "PDF",
      },
      {
        onSuccess: () => toast.success(`Report "${v.report}" generated.`),
        onError: (e) =>
          toast.error(
            e instanceof Error
              ? `${e.message} — run supabase/13_completion_pack.sql to enable report writes.`
              : "Could not generate report.",
          ),
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Inventory Reports"
        description="Reports overview and controls."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search reports…"
            primaryLabel="Generate"
            onPrimary={() => setAddOpen(true)}
            onExport={handleExport}
            branches={branches}
            branch={branch}
            onBranchChange={setBranch}
          />
        </div>
        <PeriodFilter value={period.key} onChange={setPeriod} />
      </div>
      <EntityFormDialog
        mode="add"
        title="Generate Inventory Report"
        description="Registers the report; Download renders it from live inventory data for the selected period."
        fields={GENERATE_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleGenerate}
      />
      <DataTableCard
        columns={COLUMNS}
        isLoading={isLoading}
        count={data.length}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {pageItems.map((r) => (
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
                onClick={() => handleDownload(r)}
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
