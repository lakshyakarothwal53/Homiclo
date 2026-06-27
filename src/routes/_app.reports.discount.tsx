import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/reports/discount")({
  head: () => ({
    meta: [
      { title: "Discount Performance — HOMIQLO" },
      { name: "description", content: "ROI of every campaign." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Reports"
      title="Discount Performance"
      description="ROI of every campaign."
    />
  );
}
