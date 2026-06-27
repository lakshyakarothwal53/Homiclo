import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/reports")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — HOMIQLO" },
      { name: "description", content: "Downloadable summaries across periods." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Attendance Reports"
      description="Downloadable summaries across periods."
    />
  );
}
