import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

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
    <PlaceholderPage
      eyebrow="Discounts"
      title="Category Discounts"
      description="Discounts across a category."
    />
  );
}
