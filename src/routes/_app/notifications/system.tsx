import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList } from "@/components/notifications/alerts";
import { useNotifications } from "@/hooks/use-notifications";

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
  const { data: items = [] } = useNotifications("system");
  return (
    <>
      <PageHeader
        eyebrow="Notifications › System"
        title="System Notifications"
        description="System overview and controls."
      />
      <AlertList items={items} />
    </>
  );
}
