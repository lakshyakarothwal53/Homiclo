import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBarcodeDetector, SCAN_FORMATS } from "@/lib/barcode-detector";

/**
 * Camera-based scan fallback for when the USB gun isn't handy. Opens as a
 * dialog from the POS Dashboard's "Scan" button; on a detected code it fires
 * onDetect and closes itself.
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
  const rafRef = useRef<number | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [starting, setStarting] = useState(false);

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }

    let cancelled = false;
    setUnsupported(false);
    setStarting(true);

    const detector = getBarcodeDetector(SCAN_FORMATS.barcode);
    if (!detector) {
      setUnsupported(true);
      setStarting(false);
      return;
    }

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
          if (!video) return;
          video.srcObject = stream;
          video.play().catch(() => undefined);

          const tick = async () => {
            if (!streamRef.current || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0].rawValue) {
                const code = codes[0].rawValue;
                stop();
                onOpenChange(false);
                onDetect(code);
                return;
              }
            } catch {
              /* frame not ready yet */
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStarting(false);
          toast.error("Camera unavailable — check browser permissions.");
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

        {unsupported ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Live camera scanning isn't supported in this browser. Use the USB scanner or search
            manually.
          </p>
        ) : (
          <div className="grid h-56 w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-brand/50 bg-black text-sm text-brand">
            {starting ? (
              "Starting camera…"
            ) : (
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            )}
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
