import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/notifications/system")({
  head: () => ({
    meta: [
      { title: "System Notifications — HOMIQLO" },
      { name: "description", content: "Platform announcements." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Notifications"
      title="System Notifications"
      description="Platform announcements."
    />
  );
}
