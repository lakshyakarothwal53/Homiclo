import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/categories")({
  head: () => ({
    meta: [
      { title: "Categories — HOMIQLO" },
      { name: "description", content: "Organize products into categories." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Categories"
      description="Organize products into categories."
    />
  );
}
