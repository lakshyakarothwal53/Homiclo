import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/reports/financial")({
  head: () => ({
    meta: [
      { title: "Financial Reports — HOMIQLO" },
      { name: "description", content: "P&L, cash flow and ledgers." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Reports"
      title="Financial Reports"
      description="P&L, cash flow and ledgers."
    />
  );
}
