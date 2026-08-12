import { useEffect, useRef } from "react";

// A USB barcode scanner (e.g. the Impact IHS310X) is a keyboard-wedge device: it
// "types" the barcode's characters very fast and ends with Enter. We tell it apart
// from a human by inter-keystroke timing — scanner bursts land within a few ms of
// each other, far faster than anyone can type.

type Options = {
  onScan: (code: string) => void;
  enabled?: boolean;
  minLength?: number;
  // Max ms between keystrokes to still count as the same scan burst.
  maxIntervalMs?: number;
};

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  // 35ms was too tight for some wedge scanners (and anything relayed through
  // a remote/virtual desktop adds its own jitter), causing real scans to be
  // silently dropped as "human typing". 80ms is still far faster than anyone
  // can type a barcode by hand, but forgiving enough to catch real scanners.
  maxIntervalMs = 80,
}: Options) {
  // Keep the latest onScan without re-binding the listener each render.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let lastTime = 0;
    // True while the current buffer has been built from fast (scanner) keystrokes.
    let looksLikeScan = false;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const gap = now - lastTime;
      lastTime = now;

      if (e.key === "Enter") {
        if (looksLikeScan && buffer.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(buffer);
        }
        buffer = "";
        looksLikeScan = false;
        return;
      }

      // Only single printable characters are part of a barcode.
      if (e.key.length !== 1) return;

      if (buffer === "" || gap <= maxIntervalMs) {
        // First char, or a fast follow-on keystroke → part of a scan burst.
        buffer += e.key;
        if (buffer.length > 1 && gap <= maxIntervalMs) looksLikeScan = true;
      } else {
        // Slow keystroke → treat as a fresh (human) sequence.
        buffer = e.key;
        looksLikeScan = false;
      }
    }

    // Capture phase so we can pre-empt inputs/forms before they see the Enter.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, minLength, maxIntervalMs]);
}
