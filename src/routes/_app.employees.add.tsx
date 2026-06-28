import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees/add")({
  head: () => ({
    meta: [
      { title: "Add Employee — HOMIQLO" },
      { name: "description", content: "Onboard a new team member." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Add Employee"
      description="Onboard a new team member."
    />
  );
}
