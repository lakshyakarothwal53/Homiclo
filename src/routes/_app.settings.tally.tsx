import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/settings/tally")({
  head: () => ({
    meta: [
      { title: "Tally Configuration — HOMIQLO" },
      { name: "description", content: "Tally ERP connection." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="Tally Configuration"
      description="Tally ERP connection."
    />
  );
}
