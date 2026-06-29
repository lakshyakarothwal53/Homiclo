import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { useReports } from "@/hooks/use-reports";

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
  const { data = [] } = useReports("sales");
  return (
    <ReportListPage
      eyebrow="Reports › Sales"
      title="Sales Reports"
      description="Sales overview and controls."
      rows={data}
    />
  );
}
