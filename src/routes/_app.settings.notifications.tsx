import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Settings — HOMIQLO" },
      { name: "description", content: "Channels and recipients." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="Notification Settings"
      description="Channels and recipients."
    />
  );
}
