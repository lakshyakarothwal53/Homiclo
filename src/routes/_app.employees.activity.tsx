import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees/activity")({
  head: () => ({
    meta: [
      { title: "Activity Tracking — HOMIQLO" },
      { name: "description", content: "What each employee is doing right now." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Activity Tracking"
      description="What each employee is doing right now."
    />
  );
}
