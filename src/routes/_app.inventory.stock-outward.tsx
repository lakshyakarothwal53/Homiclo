import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/stock-outward")({
  head: () => ({
    meta: [
      { title: "Stock Outward — HOMIQLO" },
      { name: "description", content: "Track outbound transfers and dispatches." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Stock Outward"
      description="Track outbound transfers and dispatches."
    />
  );
}
