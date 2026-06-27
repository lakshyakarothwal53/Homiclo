import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({
    meta: [
      { title: "Billing Overview — HOMIQLO" },
      { name: "description", content: "Invoices, payments and reconciliation." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Billing Overview"
      description="Invoices, payments and reconciliation."
    />
  );
}
