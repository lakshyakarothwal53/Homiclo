import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/attendance/live")({
  head: () => ({
    meta: [
      { title: "Live Tracking — HOMIQLO" },
      { name: "description", content: "Real-time presence with GPS and photo verification." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Attendance"
      title="Live Tracking"
      description="Real-time presence with GPS and photo verification."
    />
  );
}
