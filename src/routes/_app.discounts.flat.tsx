import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

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
    <PlaceholderPage
      eyebrow="Discounts"
      title="Flat Discounts"
      description="Fixed-amount offers."
    />
  );
}
