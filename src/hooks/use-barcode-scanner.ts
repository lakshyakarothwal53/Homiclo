import { useEffect, useRef } from "react";

// Keyboard-wedge / HID barcode scanners (e.g. Honeywell Impact) type the
// scanned code as keystrokes far faster than a human typist — that timing gap
// is how a scan is told apart from normal typing, no scanner-specific API
// needed. Not every scanner is configured to send a terminator key (Enter/Tab)
// after the code, so a scan is also flushed automatically once the burst of
// fast keystrokes pauses, instead of relying on a terminator alone.
const MAX_GAP_MS = 50;
const FLUSH_DELAY_MS = 80;
const MIN_LENGTH = 3;

export function useBarcodeScanner(onScan: (code: string) => void) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    function flush() {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      if (buffer.current.length >= MIN_LENGTH) onScanRef.current(buffer.current);
      buffer.current = "";
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "Tab") {
        if (buffer.current.length >= MIN_LENGTH) e.preventDefault();
        flush();
        return;
      }
      if (e.key.length !== 1) return; // ignore Shift, Ctrl, arrows, etc.

      const now = Date.now();
      const gap = now - lastKeyTime.current;
      lastKeyTime.current = now;

      buffer.current = gap > MAX_GAP_MS ? e.key : buffer.current + e.key;

      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, FLUSH_DELAY_MS);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);
}
