import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

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
    <PlaceholderPage
      eyebrow="Notifications"
      title="Low Stock Alerts"
      description="Inventory warnings."
    />
  );
}
