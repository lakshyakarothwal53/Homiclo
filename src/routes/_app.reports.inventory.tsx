import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/reports/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Reports — HOMIQLO" },
      { name: "description", content: "Stock health and turnover." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Reports"
      title="Inventory Reports"
      description="Stock health and turnover."
    />
  );
}
