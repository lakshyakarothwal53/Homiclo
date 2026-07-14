import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList } from "@/components/notifications/alerts";
import { useNotifications } from "@/hooks/use-notifications";

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
  const { data: items = [] } = useNotifications("payment");
  return (
    <>
      <PageHeader
        eyebrow="Notifications › Payment"
        title="Payment Alerts"
        description="Payment overview and controls."
      />
      <AlertList items={items} />
    </>
  );
}
