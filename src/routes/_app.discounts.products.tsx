import { createFileRoute } from "@tanstack/react-router";
import { PromoDiscountsPage } from "@/components/discounts/PromoDiscountsPage";
import { samplePromoRows } from "@/components/discounts/sample-data";

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
    <PromoDiscountsPage
      eyebrow="Discounts › Products"
      title="Product Discounts"
      description="Products overview and controls."
      addLabel="Add Product Discount"
      initialRows={samplePromoRows("Product")}
    />
  );
}
