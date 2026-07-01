import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { useTableQuery } from "@/components/billing/use-table-query";
import { exportToExcel } from "@/lib/export";
import { useBillingReports } from "@/hooks/use-billing";
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

function Page() {
  const { data: reports = [] } = useBillingReports();
  const { search, setSearch, rows } = useTableQuery(reports, ["report", "period", "format"]);

  function handleExport() {
    exportToExcel(
      "billing-reports",
      ["Report", "Period", "Generated", "Format"],
      rows.map((r) => [r.report, r.period, r.generated, r.format]),
    );
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
        <button
          onClick={() => toast.success(`Downloading ${r.report} (${r.format})`)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
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
      <FilterBar
        searchPlaceholder="Search reports..."
        addLabel="Add New"
        search={search}
        onSearchChange={setSearch}
        onExport={handleExport}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.report} />
      </Card>
    </>
  );
}
