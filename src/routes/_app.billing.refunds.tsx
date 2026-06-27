import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — HOMIQLO" },
      { name: "description", content: "Process and track refund requests." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Refunds"
      description="Process and track refund requests."
    />
  );
}
