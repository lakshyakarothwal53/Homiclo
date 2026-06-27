import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees")({
  head: () => ({
    meta: [
      { title: "Employee List — HOMIQLO" },
      { name: "description", content: "All employees across HOMIQLO branches." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Employee List"
      description="All employees across HOMIQLO branches."
    />
  );
}
