import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";

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
    <ReportListPage
      eyebrow="Reports › Attendance"
      title="Attendance Reports"
      description="Attendance overview and controls."
      category="attendance"
    />
  );
}
