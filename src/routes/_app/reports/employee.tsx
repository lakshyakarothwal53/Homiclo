import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";

export const Route = createFileRoute("/_app/reports/employee")({
  head: () => ({
    meta: [
      { title: "Employee Reports — HOMIQLO" },
      { name: "description", content: "Productivity and presence." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ReportListPage
      eyebrow="Reports › Employee"
      title="Employee Reports"
      description="Employee overview and controls."
      category="employee"
    />
  );
}
