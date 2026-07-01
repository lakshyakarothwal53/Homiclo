import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { useBillingBranches, useBillingReports } from "@/hooks/use-billing";
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
  const [branch, setBranch] = useState("all");
  const { data: reports = [] } = useBillingReports(undefined, branch);
  const { data: branches = [] } = useBillingBranches();
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
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={reports} rowKey={(r) => r.report} />
        <EntriesFooter shown={reports.length} total={reports.length} />
      </Card>
    </>
  );
}
