import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/absent")({
  head: () => ({
    meta: [
      { title: "Absent Report — HOMIQLO" },
      { name: "description", content: "Employees absent without prior leave." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Absent Report"
      description="Employees absent without prior leave."
    />
  );
}
