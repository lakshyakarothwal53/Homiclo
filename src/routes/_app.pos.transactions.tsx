import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/pos/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — HOMIQLO" },
      { name: "description", content: "Every POS transaction across registers." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="POS"
      title="Transactions"
      description="Every POS transaction across registers."
    />
  );
}
