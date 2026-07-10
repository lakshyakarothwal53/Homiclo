import { createFileRoute } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ScannerView } from "@/components/pos/ScannerView";

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
    <>
      <PageHeader
        eyebrow="POS"
        title="Scanner"
        description="Barcode and QR scanning workstation."
      />
      <ScannerView
        icon={ScanLine}
        label="Scanner"
        instruction="Point the camera at a product barcode"
      />
    </>
  );
}
