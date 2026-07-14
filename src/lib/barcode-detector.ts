// Pure JS/WASM barcode decoding (zxing-js) shared by ScannerView and
// CameraScanDialog. Unlike the native `BarcodeDetector` API, this works in
// every browser/platform (including desktop Chrome on Windows and Cloudflare-
// deployed builds), since it decodes frames in-browser rather than relying on
// an OS-level detection backend.
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

export const SCAN_FORMATS: Record<"barcode" | "qr", BarcodeFormat[]> = {
  barcode: [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ],
  qr: [BarcodeFormat.QR_CODE],
};

function createReader(formats: BarcodeFormat[]): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

// Starts continuous decoding against an already-playing <video> element fed
// by `stream`. Calls `onDetect` once with the first successfully decoded
// value, then stops itself. Returns a stop() to cancel early (e.g. dialog
// closed before anything was scanned).
export function startBarcodeScan(
  video: HTMLVideoElement,
  stream: MediaStream,
  formats: BarcodeFormat[],
  onDetect: (code: string) => void,
): { stop: () => void } {
  const reader = createReader(formats);
  let controls: IScannerControls | null = null;
  let stopped = false;

  reader
    .decodeFromStream(stream, video, (result) => {
      if (stopped || !result) return;
      const text = result.getText();
      if (!text) return;
      stopped = true;
      controls?.stop();
      onDetect(text);
    })
    .then((c) => {
      controls = c;
      if (stopped) controls.stop();
    })
    .catch(() => {
      /* stream ended / decode setup failed — caller handles via getUserMedia rejection */
    });

  return {
    stop: () => {
      stopped = true;
      controls?.stop();
    },
  };
}
