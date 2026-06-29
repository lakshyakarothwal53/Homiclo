import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/history")({
  head: () => ({
    meta: [
      { title: "Employee History — HOMIQLO" },
      { name: "description", content: "Per-employee attendance timeline." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Employee History"
      description="Per-employee attendance timeline."
    />
  );
}
