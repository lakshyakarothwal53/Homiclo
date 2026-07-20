import { createFileRoute } from "@tanstack/react-router";
import { Page as AttendanceReportsPage } from "@/routes/_app/attendance/reports";

// Deliberately renders the exact same page as Attendance › Reports (not a
// separate ReportListPage-backed implementation) so the two never drift —
// same real data, same Generate/View/Download/Delete behavior.
export const Route = createFileRoute("/_app/reports/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — HOMIQLO" },
      { name: "description", content: "Trends across teams and periods." },
    ],
  }),
  component: AttendanceReportsPage,
});
