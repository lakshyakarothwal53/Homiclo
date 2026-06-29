import { createFileRoute } from "@tanstack/react-router";
import { PromoDiscountsPage } from "@/components/discounts/PromoDiscountsPage";
import { useDiscountPromos } from "@/hooks/use-discounts";

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
  const { data: initialRows = [] } = useDiscountPromos("flat");
  return (
    <PromoDiscountsPage
      eyebrow="Discounts › Flat"
      title="Flat Discounts"
      description="Flat overview and controls."
      addLabel="Add Flat Discount"
      lockType="flat"
      initialRows={initialRows}
    />
  );
}
