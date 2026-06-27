import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/billing/reports")({
  head: () => ({
    meta: [
      { title: "Billing Reports — HOMIQLO" },
      { name: "description", content: "Revenue, dues and tax summaries." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Billing"
      title="Billing Reports"
      description="Revenue, dues and tax summaries."
    />
  );
}
