import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Overview — HOMIQLO" },
      { name: "description", content: "Stock levels across categories." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Inventory Overview"
      description="Stock levels across categories."
    />
  );
}
