// Minimal typing + accessor for the native BarcodeDetector API
// (Chrome/Edge/Android). Shared by ScannerView and CameraScanDialog so both
// camera-based scan surfaces use the same detection logic.

export type DetectedBarcode = { rawValue: string };
export type BarcodeDetectorInstance = {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
};
export type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

export const SCAN_FORMATS: Record<"barcode" | "qr", string[]> = {
  barcode: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
  qr: ["qr_code"],
};

export function getBarcodeDetector(formats: string[]): BarcodeDetectorInstance | null {
  const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats });
  } catch {
    return null;
  }
}
