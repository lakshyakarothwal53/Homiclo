import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Barcode, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePosProducts } from "@/hooks/use-pos";
import { printBarcodes } from "@/lib/barcode-utils";
import { formatINR } from "@/components/pos/products";
import type { PosProduct } from "@/types/pos";

// Minimal typing for the native BarcodeDetector API (Chrome/Edge/Android).
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

function getBarcodeDetector(formats: string[]): BarcodeDetectorInstance | null {
  const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats });
  } catch {
    return null;
  }
}

const FORMATS: Record<"barcode" | "qr", string[]> = {
  barcode: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
  qr: ["qr_code"],
};

export function ScannerView({
  icon: Icon,
  label,
  instruction,
  format = "barcode",
}: {
  icon: LucideIcon;
  label: string;
  instruction: string;
  format?: "barcode" | "qr";
}) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanned, setScanned] = useState<PosProduct | null>(null);
  const [lastCode, setLastCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const { data: products = [] } = usePosProducts();

  function lookup(code: string) {
    const clean = code.trim();
    if (!clean) return;
    setLastCode(clean);
    const product = products.find(
      (p) =>
        p.sku.toLowerCase() === clean.toLowerCase() || p.name.toLowerCase() === clean.toLowerCase(),
    );
    if (product) {
      setScanned(product);
      toast.success(`${product.name} · ${formatINR(product.price)}`);
    } else {
      setScanned(null);
      toast.error(`No product found for "${clean}".`);
    }
  }

  function stopScanning() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function startScanning() {
    const detector = getBarcodeDetector(FORMATS[format]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      // Wait a tick so the <video> is rendered before attaching the stream.
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => undefined);

        if (!detector) {
          toast.info("Live decoding isn't supported in this browser — type the code below.");
          return;
        }
        const tick = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              lookup(codes[0].rawValue);
              stopScanning();
              return;
            }
          } catch {
            /* frame not ready yet */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch {
      toast.error("Camera unavailable — type the code below instead.");
    }
  }

  useEffect(() => stopScanning, []);

  return (
    <Card className="border-border p-8 sm:p-12">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand">
          <Icon className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">{label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{instruction}</p>

        <div
          className={cn(
            "mt-8 grid h-48 w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed text-sm",
            scanning
              ? "border-brand/50 bg-black text-brand"
              : "border-border text-muted-foreground",
          )}
        >
          {scanning ? (
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          ) : (
            "Camera preview"
          )}
        </div>

        <Button
          className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => (scanning ? stopScanning() : startScanning())}
        >
          {scanning ? "Stop Scanning" : "Start Scanning"}
        </Button>

        <form
          className="mt-6 flex w-full items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(manualCode);
            setManualCode("");
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or enter SKU / code manually…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Look up
          </Button>
        </form>

        {scanned && (
          <div className="mt-6 w-full rounded-lg border border-border bg-secondary/40 p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{scanned.name}</div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">{scanned.sku}</div>
                <div className="mt-1 text-sm">
                  {formatINR(scanned.price)} ·{" "}
                  <span className="text-muted-foreground">{scanned.stock} in stock</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => printBarcodes([scanned])}
              >
                <Printer className="h-4 w-4" /> Print Barcode
              </Button>
            </div>
          </div>
        )}

        {!scanned && lastCode && (
          <div className="mt-6 flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4 text-left text-sm text-muted-foreground">
            <span>“{lastCode}” isn't in the catalog — you can still print a label for it.</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => printBarcodes([{ sku: lastCode, name: lastCode }])}
            >
              <Barcode className="h-4 w-4" /> Print
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
