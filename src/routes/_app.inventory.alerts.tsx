import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/alerts")({
  head: () => ({
    meta: [
      { title: "Low Stock Alerts — HOMIQLO" },
      { name: "description", content: "Products approaching their reorder threshold." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Low Stock Alerts"
      description="Products approaching their reorder threshold."
    />
  );
}
