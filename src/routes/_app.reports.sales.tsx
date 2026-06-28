import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { SALES_REPORTS } from "@/components/reports/data";

export const Route = createFileRoute("/_app/reports/sales")({
  head: () => ({
    meta: [
      { title: "Sales Reports — HOMIQLO" },
      { name: "description", content: "Revenue breakdown across channels." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ReportListPage
      eyebrow="Reports › Sales"
      title="Sales Reports"
      description="Sales overview and controls."
      rows={SALES_REPORTS}
    />
  );
}
