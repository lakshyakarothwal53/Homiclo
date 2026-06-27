import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/sales-bills")({
  head: () => ({
    meta: [
      { title: "Sales Bills — HOMIQLO" },
      { name: "description", content: "All issued sales bills." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Sales Bills"
      description="All issued sales bills."
    />
  );
}
