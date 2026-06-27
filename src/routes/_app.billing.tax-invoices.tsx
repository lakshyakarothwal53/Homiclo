import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/tax-invoices")({
  head: () => ({
    meta: [
      { title: "Tax Invoices — HOMIQLO" },
      { name: "description", content: "GST tax invoices and exports." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Tax Invoices"
      description="GST tax invoices and exports."
    />
  );
}
