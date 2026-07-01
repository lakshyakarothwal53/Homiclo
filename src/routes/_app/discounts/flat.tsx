import { createFileRoute } from "@tanstack/react-router";
import { PromoDiscountsPage } from "@/components/discounts/PromoDiscountsPage";

export const Route = createFileRoute("/_app/discounts/flat")({
  head: () => ({
    meta: [
      { title: "Flat Discounts — HOMIQLO" },
      { name: "description", content: "Fixed-amount offers." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PromoDiscountsPage
      eyebrow="Discounts › Flat"
      title="Flat Discounts"
      description="Flat overview and controls."
      addLabel="Add Flat Discount"
      lockType="flat"
      discountType="flat"
    />
  );
}
