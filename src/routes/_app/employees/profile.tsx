import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees/profile")({
  head: () => ({
    meta: [
      { title: "Employee Profile — HOMIQLO" },
      { name: "description", content: "Personal details, role and attendance." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Employee Profile"
      description="Personal details, role and attendance."
    />
  );
}
