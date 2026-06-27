import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/reports")({
  head: () => ({
    meta: [
      { title: "Inventory Reports — HOMIQLO" },
      { name: "description", content: "Valuation, turnover and aging reports." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Inventory Reports"
      description="Valuation, turnover and aging reports."
    />
  );
}
