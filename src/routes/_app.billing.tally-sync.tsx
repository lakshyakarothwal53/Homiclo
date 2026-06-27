import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/tally-sync")({
  head: () => ({
    meta: [
      { title: "Tally Sync — HOMIQLO" },
      { name: "description", content: "Sync ledgers with Tally ERP." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Tally Sync"
      description="Sync ledgers with Tally ERP."
    />
  );
}
