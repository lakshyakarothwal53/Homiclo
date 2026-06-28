import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { ATTENDANCE_REPORTS } from "@/components/reports/data";

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
      rows={ATTENDANCE_REPORTS}
    />
  );
}
