import { createFileRoute } from "@tanstack/react-router";
import { PromoDiscountsPage } from "@/components/discounts/PromoDiscountsPage";
import { useDiscountPromos } from "@/hooks/use-discounts";

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
  const { data: initialRows = [] } = useDiscountPromos("product");
  return (
    <PromoDiscountsPage
      eyebrow="Discounts › Products"
      title="Product Discounts"
      description="Products overview and controls."
      addLabel="Add Product Discount"
      initialRows={initialRows}
    />
  );
}
