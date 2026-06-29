import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/settings")({
  head: () => ({
    meta: [
      { title: "Attendance Settings — HOMIQLO" },
      { name: "description", content: "Shifts, geo-fence radius and verification rules." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Attendance Settings"
      description="Shifts, geo-fence radius and verification rules."
    />
  );
}
