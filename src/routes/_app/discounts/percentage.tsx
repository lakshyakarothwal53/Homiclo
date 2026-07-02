import { createFileRoute } from "@tanstack/react-router";
import { PromoDiscountsPage } from "@/components/discounts/PromoDiscountsPage";

export const Route = createFileRoute("/_app/discounts/percentage")({
  head: () => ({
    meta: [
      { title: "Percentage Discounts — HOMIQLO" },
      { name: "description", content: "Percent-off offers." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PromoDiscountsPage
      eyebrow="Discounts › Percentage"
      title="Percentage Discounts"
      description="Percentage overview and controls."
      addLabel="Add Percentage Discount"
      lockType="percentage"
      discountType="percentage"
    />
  );
}
