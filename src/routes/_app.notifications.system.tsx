import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList, SYSTEM_ALERTS } from "@/components/notifications/alerts";

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
    <>
      <PageHeader
        eyebrow="Notifications › System"
        title="System Notifications"
        description="System overview and controls."
      />
      <AlertList items={SYSTEM_ALERTS} />
    </>
  );
}
