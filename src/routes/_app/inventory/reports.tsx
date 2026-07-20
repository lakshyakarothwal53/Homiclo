import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
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
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBranches,
  useCreateInventoryReport,
  useInventoryReports,
  useRefreshInventoryReport,
} from "@/hooks/use-inventory";
import { buildTablePdf, downloadCsv, downloadPdf, openPdf } from "@/lib/pdf-utils";
import { fetchNamedInventoryReport, inRange, parseRowDate } from "@/lib/report-data";
import type { InventoryReport } from "@/types/inventory";

// Each report's period label is either "<Mon> <year>" (monthly) or
// "Q<n> <year>" (quarterly) — inferred from whatever style the row already
// uses, so a refresh keeps its cadence instead of guessing one.
function currentPeriodLabel(existing: string, now: Date): string {
  if (/^Q\d/.test(existing)) {
    return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  }
  return now.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function todayGeneratedLabel(now: Date): string {
  return `${String(now.getDate()).padStart(2, "0")} ${now.toLocaleString("en-US", { month: "short" })} ${now.getFullYear()}`;
}

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

// The only report names fetchNamedInventoryReport (report-data.ts) actually
// recognizes with their own live calculator — picking from this list instead
// of free-typing a name is what stops "Download" from ever landing on an
// unrecognized report that falls back to the generic product dump.
const REPORT_NAMES = [
  "Stock Valuation Report",
  "Fast Moving Items",
  "Slow Moving Items",
  "Stock Ageing",
  "Low Stock Summary",
  "Category Performance",
];

// Some of these report types run monthly ("Jul 2026"), others quarterly
// ("Q3 2026") — see currentPeriodLabel's inference. Rather than guess which
// cadence the picked Report Name wants (EntityFormDialog's fields are static,
// so Period can't depend on the Report Name selection), the dropdown offers
// both: the last 6 months and the last 4 quarters.
function buildPeriodOptions(): string[] {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
  );
  const quarterStart = Math.floor(now.getMonth() / 3) * 3;
  const quarters = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), quarterStart - i * 3, 1);
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  });
  return [...months, ...quarters];
}

const GENERATE_FIELDS: EntityField[] = [
  {
    key: "report",
    label: "Report Name",
    type: "select",
    options: REPORT_NAMES,
    required: true,
  },
  {
    key: "period",
    label: "Period",
    type: "select",
    options: buildPeriodOptions(),
    required: true,
  },
  {
    key: "format",
    label: "Format",
    type: "select",
    options: ["PDF", "Excel"],
    required: true,
  },
];

export function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [period, setPeriod] = useState<PeriodOption>({ key: "all", label: "All time" });
  const [addOpen, setAddOpen] = useState(false);
  const { data: allReports = [], isLoading } = useInventoryReports(search);
  const { data: branches = [] } = useBranches();
  const createReport = useCreateInventoryReport();
  const refreshReport = useRefreshInventoryReport();

  // Beyond the manual "Generate" button below, the moment this catalog of
  // report rows notices one has fallen behind (its period isn't the current
  // month/quarter), it also rolls that row forward automatically — so
  // between generations the list never shows a permanently stale entry.
  useEffect(() => {
    if (allReports.length === 0) return;
    const now = new Date();
    const generated = todayGeneratedLabel(now);
    allReports.forEach((r) => {
      const current = currentPeriodLabel(r.period, now);
      if (r.period !== current) {
        refreshReport.mutate({ id: r.id, period: current, generated });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReports]);

  // Filter the visible report rows by the same Day/Month/All-time selection
  // that scopes what Download actually pulls, using each row's own
  // "Generated" date — not just a display label with no effect on the list.
  const data = useMemo(
    () => allReports.filter((r) => inRange(parseRowDate(r.generated), period.from, period.to)),
    [allReports, period.from, period.to],
  );
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

  // Always previews as PDF regardless of the row's own stored format (CSV/
  // Excel rows still get a readable on-screen preview before download).
  async function handleView(r: InventoryReport) {
    try {
      const live = await fetchNamedInventoryReport(r.report, opts());
      if (live.rows.length === 0) {
        toast.error("No inventory data available for this period.");
        return;
      }
      const subtitle = period.key === "all" ? r.period : `${r.period} · ${period.label}`;
      openPdf(buildTablePdf({ title: r.report, subtitle, ...live }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report.");
    }
  }

  function handleGenerate(v: EntityValues) {
    createReport.mutate(
      {
        report: String(v.report),
        period: String(v.period),
        generated: todayGeneratedLabel(new Date()),
        format: v.format === "Excel" ? "Excel" : "PDF",
      },
      {
        onSuccess: () => toast.success(`Report "${v.report}" generated.`),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not generate report."),
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
            {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
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
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleView(r)}
                >
                  <Eye className="h-4 w-4" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleDownload(r)}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
