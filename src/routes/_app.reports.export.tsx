import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/reports/export")({
  head: () => ({
    meta: [
      { title: "Export Reports — HOMIQLO" },
      { name: "description", content: "Bulk export in CSV / Excel / PDF." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Reports"
      title="Export Reports"
      description="Bulk export in CSV / Excel / PDF."
    />
  );
}
