import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

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
    <PlaceholderPage
      eyebrow="Discounts"
      title="Percentage Discounts"
      description="Percent-off offers."
    />
  );
}
