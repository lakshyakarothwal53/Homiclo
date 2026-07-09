import { createFileRoute } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ScannerView } from "@/components/pos/ScannerView";

export const Route = createFileRoute("/_app/pos/qr")({
  head: () => ({
    meta: [
      { title: "QR Scanner — HOMIQLO" },
      { name: "description", content: "QR overview and controls." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader eyebrow="POS › QR" title="QR Scanner" description="QR overview and controls." />
      <ScannerView
        icon={QrCode}
        label="QR Code"
        instruction="Position the qr code in front of the scanner"
      />
    </>
  );
}
