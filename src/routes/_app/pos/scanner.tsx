import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/pos/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — HOMIQLO" },
      { name: "description", content: "Barcode and QR scanning workstation." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="POS"
      title="Scanner"
      description="Barcode and QR scanning workstation."
    />
  );
}
