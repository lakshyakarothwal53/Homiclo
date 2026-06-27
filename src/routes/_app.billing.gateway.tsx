import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/gateway")({
  head: () => ({
    meta: [
      { title: "Payment Gateway — HOMIQLO" },
      { name: "description", content: "Online transactions and settlements." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Payment Gateway"
      description="Online transactions and settlements."
    />
  );
}
