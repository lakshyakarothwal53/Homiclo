import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/reports/sales")({
  head: () => ({
    meta: [
      { title: "Sales Reports — HOMIQLO" },
      { name: "description", content: "Revenue breakdown across channels." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Reports"
      title="Sales Reports"
      description="Revenue breakdown across channels."
    />
  );
}
