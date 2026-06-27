import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/create-invoice")({
  head: () => ({
    meta: [
      { title: "Create Invoice — HOMIQLO" },
      { name: "description", content: "Generate a new GST-compliant invoice." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Create Invoice"
      description="Generate a new GST-compliant invoice."
    />
  );
}
