import { createFileRoute } from "@tanstack/react-router";
import { Page as InventoryReportsPage } from "@/routes/_app/inventory/reports";

// Deliberately renders the exact same page as Inventory › Reports (not a
// separate ReportListPage-backed implementation) so the two never drift —
// same real data, same Generate/View/Download behavior.
export const Route = createFileRoute("/_app/reports/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Reports — HOMIQLO" },
      { name: "description", content: "Stock health and turnover." },
    ],
  }),
  component: InventoryReportsPage,
});
