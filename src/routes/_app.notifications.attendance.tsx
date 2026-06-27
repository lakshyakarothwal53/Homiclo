import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

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
    <PlaceholderPage
      eyebrow="Notifications"
      title="Attendance Alerts"
      description="Late, absent and overtime notifications."
    />
  );
}
