import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/settings/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Rules — HOMIQLO" },
      { name: "description", content: "Shifts, geo-fence and policies." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="Attendance Rules"
      description="Shifts, geo-fence and policies."
    />
  );
}
