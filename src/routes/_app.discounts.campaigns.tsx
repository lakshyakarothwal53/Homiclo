import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/discounts/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — HOMIQLO" },
      { name: "description", content: "Multi-channel promotional campaigns." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Discounts"
      title="Campaigns"
      description="Multi-channel promotional campaigns."
    />
  );
}
