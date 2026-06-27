import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/pos")({
  head: () => ({
    meta: [
      { title: "POS Dashboard — HOMIQLO" },
      { name: "description", content: "Today's POS performance at a glance." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="POS"
      title="POS Dashboard"
      description="Today's POS performance at a glance."
    />
  );
}
