import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts Dashboard — HOMIQLO" },
      { name: "description", content: "All system alerts in one place." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Notifications"
      title="Alerts Dashboard"
      description="All system alerts in one place."
    />
  );
}
