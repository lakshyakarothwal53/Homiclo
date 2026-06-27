import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

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
    <PlaceholderPage
      eyebrow="Reports"
      title="Employee Reports"
      description="Productivity and presence."
    />
  );
}
