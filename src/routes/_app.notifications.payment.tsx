import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/notifications/payment")({
  head: () => ({
    meta: [
      { title: "Payment Alerts — HOMIQLO" },
      { name: "description", content: "Failed payments and dues." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Notifications"
      title="Payment Alerts"
      description="Failed payments and dues."
    />
  );
}
