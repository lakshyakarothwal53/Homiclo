import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/products")({
  head: () => ({
    meta: [
      { title: "Products — HOMIQLO" },
      { name: "description", content: "Manage your full product catalog." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Products"
      description="Manage your full product catalog."
    />
  );
}
