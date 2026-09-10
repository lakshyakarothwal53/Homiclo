import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { PeriodFilter, type PeriodOption } from "@/components/reports/PeriodFilter";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import { useBillingBranches, useBillingReports, useCreateBillingReport } from "@/hooks/use-billing";
import { buildTablePdf, downloadCsv, downloadPdf, openPdf } from "@/lib/pdf-utils";
import { fetchNamedBillingReport, matchesDate } from "@/lib/report-data";
import type { BillingReport } from "@/types/billing";

export const Route = createFileRoute("/_app/billing/reports")({
  head: () => ({
    meta: [
      { title: "Billing Reports — HOMIQLO" },
      { name: "description", content: "Revenue, dues and tax summaries." },
    ],
  }),
  component: Page,
});

// The only report names fetchNamedBillingReport (report-data.ts) actually
// recognizes with their own live calculator — picking from this list instead
// of free-typing a name is what stops "Download" from ever landing on an
// unrecognized report that falls back to the generic sales/financial dump.
const REPORT_NAMES = [
  "Daily Sales Summary",
  "Daily Sales Trend",
  "Weekly Sales Summary",
  "Monthly Sales Summary",
  "Tax Summary (GST)",
  "Outstanding Payments",
  "Refund Summary",
];

const displayDate = (d: Date) =>
  `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;

// These reports run daily ("12 Nov 2024"), weekly ("Week of 8 Sep 2024") or
// monthly ("Nov 2024") — EntityFormDialog's fields are static, so Period
// can't dynamically follow whichever Report Name is picked. Offer all three
// cadences: the last 7 days, the last 6 weeks and the last 6 months. (The
// actual data range on Download/View comes from the PeriodFilter, not this
// stored label.)
function buildPeriodOptions(): string[] {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    return displayDate(d);
  });
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - i * 7);
    return `Week of ${displayDate(monday)}`;
  });
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
  );
  return [...days, ...weeks, ...months];
}

const REPORT_FIELDS: EntityField[] = [
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
    options: ["PDF", "CSV"],
    required: true,
  },
];

// The catalog is a fixed set of known calculators (REPORT_NAMES /
// fetchNamedBillingReport). Render every one of them even when the
// billing_reports table is empty or read-only — the anon key can't insert
// into it until supabase/13_completion_pack.sql runs, so "Add New" would
// otherwise be the only way to get a Weekly/Monthly row and it fails. These
// defaults always give a working View/Download; the table just records which
// reports have actually been generated (real "Generated" date, branch, etc.).
const DEFAULT_PERIOD: Record<string, string> = {
  "Daily Sales Summary": "Today",
  "Daily Sales Trend": "Last 30 days",
  "Weekly Sales Summary": "Last 6 weeks",
  "Monthly Sales Summary": "Last 6 months",
  "Tax Summary (GST)": "This month",
  "Outstanding Payments": "All time",
  "Refund Summary": "All time",
};

const DEFAULT_REPORTS: BillingReport[] = REPORT_NAMES.map((report) => ({
  report,
  period: DEFAULT_PERIOD[report] ?? "All time",
  generated: displayDate(new Date()),
  format: "PDF",
}));

/** DB rows first (real generated dates), then session-added, then the static
 * catalog — deduped by report name so each appears once. */
function mergeReports(...lists: BillingReport[][]): BillingReport[] {
  const seen = new Set<string>();
  const out: BillingReport[] = [];
  for (const r of lists.flat()) {
    const key = r.report.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [period, setPeriod] = useState<PeriodOption>({ key: "all", label: "All time" });
  const [addOpen, setAddOpen] = useState(false);
  // Reports added this session — kept locally so a new Weekly/Monthly row is
  // usable immediately even when the billing_reports table rejects the insert.
  const [sessionReports, setSessionReports] = useState<BillingReport[]>([]);
  const { data: dbReports = [] } = useBillingReports(search);
  const { data: branches = [] } = useBillingBranches();
  const createReport = useCreateBillingReport();
  const reports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return mergeReports(dbReports, sessionReports, DEFAULT_REPORTS)
      .filter((r) => !term || r.report.toLowerCase().includes(term))
      .filter((r) => matchesDate(date, r.generated));
  }, [dbReports, sessionReports, search, date]);
  const { page, setPage, totalPages, pageItems } = usePagination(reports);

  const opts = () => ({
    from: period.from,
    to: period.to,
    branch: branch === "all" ? undefined : branch,
  });

  async function handleDownload(r: BillingReport) {
    try {
      const data = await fetchNamedBillingReport(r.report, opts());
      if (data.rows.length === 0) {
        toast.error("No data available for this report and period.");
        return;
      }
      const filename = r.report.toLowerCase().replace(/\s+/g, "-");
      const subtitle = period.key === "all" ? r.period : `${r.period} · ${period.label}`;
      if (r.format.toUpperCase() === "CSV" || r.format.toUpperCase() === "EXCEL") {
        downloadCsv(filename, data.columns, data.rows);
      } else {
        downloadPdf(buildTablePdf({ title: r.report, subtitle, ...data }), filename);
      }
      toast.success(`Downloaded ${r.report} (${r.format}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate report.");
    }
  }

  // Always previews as PDF regardless of the row's own stored format (CSV
  // rows still get a readable on-screen preview before download).
  async function handleView(r: BillingReport) {
    try {
      const data = await fetchNamedBillingReport(r.report, opts());
      if (data.rows.length === 0) {
        toast.error("No data available for this report and period.");
        return;
      }
      const subtitle = period.key === "all" ? r.period : `${r.period} · ${period.label}`;
      openPdf(buildTablePdf({ title: r.report, subtitle, ...data }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report.");
    }
  }

  function handleExport() {
    if (reports.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "billing-reports.csv",
      ["Report", "Period", "Generated", "Format"],
      reports.map((r) => [r.report, r.period, r.generated, r.format]),
    );
    toast.success(`Exported ${reports.length} reports.`);
  }

  function handleAdd(v: EntityValues) {
    const row: BillingReport = {
      report: String(v.report),
      period: String(v.period),
      generated: displayDate(new Date()),
      format: String(v.format),
    };
    // Show and enable View/Download right away, whether or not the catalog
    // table accepts the write.
    setSessionReports((prev) => [row, ...prev.filter((r) => r.report !== row.report)]);
    createReport.mutate(row, {
      onSuccess: () => toast.success(`Report "${row.report}" added.`),
      // billing_reports is read-only to the anon key until
      // supabase/13_completion_pack.sql runs — the row still works this
      // session, it just won't survive a refresh yet.
      onError: () =>
        toast.message(`"${row.report}" is ready to view and download.`, {
          description:
            "Run supabase/13_completion_pack.sql to make added reports persist after refresh.",
        }),
    });
  }

  const columns: Column<BillingReport>[] = [
    {
      key: "report",
      header: "Report",
      render: (r) => <span className="font-medium">{r.report}</span>,
    },
    {
      key: "period",
      header: "Period",
      render: (r) => <span className="text-muted-foreground">{r.period}</span>,
    },
    {
      key: "generated",
      header: "Generated",
      render: (r) => <span className="text-muted-foreground">{r.generated}</span>,
    },
    {
      key: "format",
      header: "Format",
      render: (r) => <span className="text-muted-foreground">{r.format}</span>,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleView(r)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button
            onClick={() => handleDownload(r)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Billing › Reports"
        title="Billing Reports"
        description="Reports overview and controls."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search reports..."
            date={date}
            onDateChange={setDate}
            addLabel="Add New"
            onAdd={() => setAddOpen(true)}
            onExport={handleExport}
            {...(scoped ? { showBranch: false } : { branches, branch, onBranchChange: setBranch })}
          />
        </div>
        <PeriodFilter value={period.key} onChange={setPeriod} />
      </div>
      <EntityFormDialog
        mode="add"
        title="New Billing Report"
        description="Register a report; Download always renders it from live billing data for the selected period."
        fields={REPORT_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.report} />
        <EntriesFooter
          total={reports.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
