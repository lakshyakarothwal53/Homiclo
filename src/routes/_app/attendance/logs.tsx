import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/logs")({
  head: () => ({
    meta: [
      { title: "Daily Logs — HOMIQLO" },
      { name: "description", content: "Every check-in and check-out across branches." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Daily Logs"
      description="Every check-in and check-out across branches."
    />
  );
}
