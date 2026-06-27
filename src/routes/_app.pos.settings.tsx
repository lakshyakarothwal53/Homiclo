import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/pos/settings")({
  head: () => ({
    meta: [
      { title: "POS Settings — HOMIQLO" },
      { name: "description", content: "Registers, taxes and receipt configuration." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="POS"
      title="POS Settings"
      description="Registers, taxes and receipt configuration."
    />
  );
}
