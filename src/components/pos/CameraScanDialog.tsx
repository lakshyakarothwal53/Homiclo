import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SCAN_FORMATS, startBarcodeScan } from "@/lib/barcode-detector";

/**
 * Camera-based scan fallback for when the USB gun isn't handy. Opens as a
 * dialog from the POS Dashboard's "Scan" button; on a detected code it fires
 * onDetect and closes itself. Decoding runs entirely in-browser via zxing-js
 * (JS/WASM), so it works on any camera-capable browser/platform rather than
 * depending on the native BarcodeDetector API.
 */
export function CameraScanDialog({
  open,
  onOpenChange,
  onDetect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetect: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<{ stop: () => void } | null>(null);
  const [starting, setStarting] = useState(false);

  function stop() {
    scanRef.current?.stop();
    scanRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }

    let cancelled = false;
    setStarting(true);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStarting(false);
        requestAnimationFrame(() => {
          const video = videoRef.current;
          if (!video || cancelled) return;
          video.srcObject = stream;
          video.play().catch(() => undefined);

          scanRef.current = startBarcodeScan(video, stream, SCAN_FORMATS.barcode, (code) => {
            stop();
            onOpenChange(false);
            onDetect(code);
          });
        });
      })
      .catch((err) => {
        if (!cancelled) {
          const name = err instanceof DOMException ? err.name : "UnknownError";
          console.error("[CameraScanDialog] getUserMedia failed:", name, err);
          setStarting(false);
          toast.error(`Camera unavailable (${name}) — check browser permissions.`);
          onOpenChange(false);
        }
      });

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan with Camera</DialogTitle>
        </DialogHeader>

        <div className="grid h-56 w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-brand/50 bg-black text-sm text-brand">
          {starting ? (
            "Starting camera…"
          ) : (
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          )}
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
