import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/discounts")({
  head: () => ({
    meta: [
      { title: "Discounts Overview — HOMIQLO" },
      { name: "description", content: "Active promotions and performance." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Discounts"
      title="Discounts Overview"
      description="Active promotions and performance."
    />
  );
}
