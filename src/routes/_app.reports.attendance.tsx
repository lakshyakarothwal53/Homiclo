import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/reports/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — HOMIQLO" },
      { name: "description", content: "Trends across teams and periods." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Reports"
      title="Attendance Reports"
      description="Trends across teams and periods."
    />
  );
}
