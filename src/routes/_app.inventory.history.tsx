import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/history")({
  head: () => ({
    meta: [
      { title: "Stock History — HOMIQLO" },
      { name: "description", content: "Movement of every SKU over time." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Stock History"
      description="Movement of every SKU over time."
    />
  );
}
