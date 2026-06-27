import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/discounts/usage-reports")({
  head: () => ({
    meta: [
      { title: "Usage Reports — HOMIQLO" },
      { name: "description", content: "Discount redemption analytics." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Discounts"
      title="Usage Reports"
      description="Discount redemption analytics."
    />
  );
}
