import { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "./products";
import type { PosProduct } from "@/types/pos";

export function BarcodeDialog({
  product,
  open,
  onOpenChange,
}: {
  product: PosProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // A ref callback (via state) instead of useRef: Dialog.Content renders into a
  // portal, so the canvas node isn't guaranteed to exist yet in the same render
  // pass where `open` flips true. Tracking the node in state re-fires this
  // effect the instant it actually mounts, instead of silently missing it.
  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasNode || !product) return;
    JsBarcode(canvasNode, product.sku, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 10,
    });
  }, [canvasNode, product]);

  function handlePrint() {
    if (!canvasNode || !product) return;
    const dataUrl = canvasNode.toDataURL("image/png");
    const win = window.open("", "_blank", "width=420,height=320");
    if (!win) return;
    win.document.write(`<!doctype html>
<html>
  <head>
    <title>${product.sku}</title>
    <style>
      body { font: 13px system-ui, sans-serif; text-align: center; padding: 24px; }
      img { max-width: 100%; }
      h1 { font-size: 14px; margin: 0 0 4px; }
      p { margin: 0 0 12px; color: #555; }
    </style>
  </head>
  <body>
    <h1>${product.name}</h1>
    <p>${formatINR(product.price)}</p>
    <img src="${dataUrl}" />
  </body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Product Barcode</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} · ${formatINR(product.price)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center rounded-md border border-border bg-white p-4">
          <canvas ref={setCanvasNode} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
