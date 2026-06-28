import { createFileRoute } from "@tanstack/react-router";
import { PromoDiscountsPage } from "@/components/discounts/PromoDiscountsPage";
import { samplePromoRows } from "@/components/discounts/sample-data";

export const Route = createFileRoute("/_app/discounts/categories")({
  head: () => ({
    meta: [
      { title: "Category Discounts — HOMIQLO" },
      { name: "description", content: "Discounts across a category." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PromoDiscountsPage
      eyebrow="Discounts › Categories"
      title="Category Discounts"
      description="Categories overview and controls."
      addLabel="Add Category Discount"
      initialRows={samplePromoRows("Category")}
    />
  );
}
