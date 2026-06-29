import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertList, ATTENDANCE_ALERTS } from "@/components/notifications/alerts";

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
  return (
    <>
      <PageHeader
        eyebrow="Notifications › Attendance"
        title="Attendance Alerts"
        description="Attendance overview and controls."
      />
      <AlertList items={ATTENDANCE_ALERTS} />
    </>
  );
}
