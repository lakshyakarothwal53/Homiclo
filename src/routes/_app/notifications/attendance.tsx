import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList } from "@/components/notifications/alerts";
import { useNotifications } from "@/hooks/use-notifications";

export const Route = createFileRoute("/_app/notifications/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Alerts — HOMIQLO" },
      { name: "description", content: "Late, absent and overtime notifications." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: items = [] } = useNotifications("attendance");
  return (
    <>
      <PageHeader
        eyebrow="Notifications › Attendance"
        title="Attendance Alerts"
        description="Attendance overview and controls."
      />
      <AlertList items={items} />
    </>
  );
}
