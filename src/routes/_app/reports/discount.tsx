import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { useReports } from "@/hooks/use-reports";

export const Route = createFileRoute("/_app/reports/discount")({
  head: () => ({
    meta: [
      { title: "Discount Performance — HOMIQLO" },
      { name: "description", content: "ROI of every campaign." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data = [] } = useReports("discount");
  return (
    <ReportListPage
      eyebrow="Reports › Discount Performance"
      title="Discount Performance Reports"
      description="Discount Performance overview and controls."
      rows={data}
    />
  );
}
