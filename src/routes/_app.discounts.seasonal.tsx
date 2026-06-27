import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/discounts/seasonal")({
  head: () => ({
    meta: [
      { title: "Seasonal Offers — HOMIQLO" },
      { name: "description", content: "Festival and seasonal promotions." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Discounts"
      title="Seasonal Offers"
      description="Festival and seasonal promotions."
    />
  );
}
