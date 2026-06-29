import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { useReports } from "@/hooks/use-reports";

export const Route = createFileRoute("/_app/reports/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Reports — HOMIQLO" },
      { name: "description", content: "Stock health and turnover." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data = [] } = useReports("inventory");
  return (
    <ReportListPage
      eyebrow="Reports › Inventory"
      title="Inventory Reports"
      description="Inventory overview and controls."
      rows={data}
    />
  );
}
