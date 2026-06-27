import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/payments")({
  head: () => ({
    meta: [
      { title: "Payments — HOMIQLO" },
      { name: "description", content: "Collected payments and pending dues." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Payments"
      description="Collected payments and pending dues."
    />
  );
}
