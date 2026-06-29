import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/late")({
  head: () => ({
    meta: [
      { title: "Late Arrivals — HOMIQLO" },
      { name: "description", content: "Employees arriving past their shift start." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Late Arrivals"
      description="Employees arriving past their shift start."
    />
  );
}
