import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { INVENTORY_REPORTS } from "@/components/reports/data";

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
  return (
    <ReportListPage
      eyebrow="Reports › Inventory"
      title="Inventory Reports"
      description="Inventory overview and controls."
      rows={INVENTORY_REPORTS}
    />
  );
}
