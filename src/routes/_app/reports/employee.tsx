import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage as EmployeeReportsPage } from "@/routes/_app/employees/reports";

// Deliberately renders the exact same page as Employees › Reports (not a
// separate ReportListPage-backed implementation) so the two never drift —
// same real data, same View/Download behavior.
export const Route = createFileRoute("/_app/reports/employee")({
  head: () => ({
    meta: [
      { title: "Employee Reports — HOMIQLO" },
      { name: "description", content: "Productivity and presence." },
    ],
  }),
  component: EmployeeReportsPage,
});
