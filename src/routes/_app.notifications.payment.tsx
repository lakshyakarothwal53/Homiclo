import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList, PAYMENT_ALERTS } from "@/components/notifications/alerts";

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
    <>
      <PageHeader
        eyebrow="Notifications › Payment"
        title="Payment Alerts"
        description="Payment overview and controls."
      />
      <AlertList items={PAYMENT_ALERTS} />
    </>
  );
}
