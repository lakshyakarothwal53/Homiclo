import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/inventory/stock-adjustment")({
  head: () => ({
    meta: [
      { title: "Stock Adjustment — HOMIQLO" },
      { name: "description", content: "Correct stock counts after audits." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Stock Adjustment"
      description="Correct stock counts after audits."
    />
  );
}
