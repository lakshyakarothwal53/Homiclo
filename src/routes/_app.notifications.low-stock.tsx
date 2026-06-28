import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList, STOCK_ALERTS } from "@/components/notifications/alerts";

export const Route = createFileRoute("/_app/notifications/low-stock")({
  head: () => ({
    meta: [
      { title: "Low Stock Alerts — HOMIQLO" },
      { name: "description", content: "Inventory warnings." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Notifications › Stock"
        title="Low Stock Alerts"
        description="Stock overview and controls."
      />
      <AlertList items={STOCK_ALERTS} />
    </>
  );
}
