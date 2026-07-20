import { createFileRoute } from "@tanstack/react-router";
import { Page as BillingReportsPage } from "@/routes/_app/billing/reports";

// Deliberately renders the exact same page as Billing › Reports (not a
// separate ReportListPage-backed implementation) so the two never drift —
// same real data, same Generate/View/Download behavior.
export const Route = createFileRoute("/_app/reports/sales")({
  head: () => ({
    meta: [
      { title: "Sales Reports — HOMIQLO" },
      { name: "description", content: "Revenue breakdown across channels." },
    ],
  }),
  component: BillingReportsPage,
});
