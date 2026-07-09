import { createFileRoute } from "@tanstack/react-router";
import { Barcode } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ScannerView } from "@/components/pos/ScannerView";

export const Route = createFileRoute("/_app/pos/barcode")({
  head: () => ({
    meta: [
      { title: "Barcode Scanner — HOMIQLO" },
      { name: "description", content: "Barcode overview and controls." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="POS › Barcode"
        title="Barcode Scanner"
        description="Barcode overview and controls."
      />
      <ScannerView
        icon={Barcode}
        label="Barcode"
        instruction="Position the barcode in front of the scanner"
      />
    </>
  );
}
