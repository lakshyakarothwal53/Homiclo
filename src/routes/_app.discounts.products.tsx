import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/discounts/products")({
  head: () => ({
    meta: [
      { title: "Product Discounts — HOMIQLO" },
      { name: "description", content: "Discounts on specific SKUs." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Discounts"
      title="Product Discounts"
      description="Discounts on specific SKUs."
    />
  );
}
