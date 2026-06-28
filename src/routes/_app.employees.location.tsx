import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees/location")({
  head: () => ({
    meta: [
      { title: "Location Tracking — HOMIQLO" },
      { name: "description", content: "Live location for field staff." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Location Tracking"
      description="Live location for field staff."
    />
  );
}
