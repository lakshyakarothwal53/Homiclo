import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/stock-inward")({
  head: () => ({
    meta: [
      { title: "Stock Inward — HOMIQLO" },
      { name: "description", content: "Record new shipments received." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Stock Inward"
      description="Record new shipments received."
    />
  );
}
