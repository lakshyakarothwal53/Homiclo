import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees/reports")({
  head: () => ({
    meta: [
      { title: "Employee Reports — HOMIQLO" },
      { name: "description", content: "Performance and time-on-task analytics." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Employee Reports"
      description="Performance and time-on-task analytics."
    />
  );
}
