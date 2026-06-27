import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Overview — HOMIQLO" },
      { name: "description", content: "Today's check-ins, late arrivals and absences." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Attendance Overview"
      description="Today's check-ins, late arrivals and absences."
    />
  );
}
