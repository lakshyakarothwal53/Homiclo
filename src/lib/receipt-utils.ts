import { barcodeSvg } from "@/lib/barcode-utils";
import type { PosLineItem, PosSettings } from "@/types/pos";

export type ReceiptData = {
  invoice: string;
  dateTime: string;
  cashier: string;
  paymentMode: string;
  upiRef?: string;
  lines: PosLineItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
};

// Browser rasterises the print job, so the ₹ glyph renders fine on the thermal roll.
const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const esc = (s: string) =>
  s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

/**
 * Build + print an 80mm (or 58mm) thermal receipt for a completed sale.
 * Uses the same new-window + window.print() approach as printBarcodes(), styled
 * for the DCode roll. Set the printer as default + launch Chrome with
 * --kiosk-printing for silent auto-printing (no dialog per sale).
 */
export function printReceipt(data: ReceiptData, settings: PosSettings) {
  const widthMm = settings.paperWidth === "58mm" ? 58 : 80;

  let invoiceBarcode = "";
  try {
    invoiceBarcode = barcodeSvg(data.invoice);
  } catch {
    invoiceBarcode = "";
  }

  const rows = data.lines
    .map(
      (l) => `<tr>
        <td class="qty">${l.qty}×</td>
        <td class="nm">${esc(l.name)}</td>
        <td class="amt">${rupee(l.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const gstin = settings.gstin ? `<div class="muted">GSTIN: ${esc(settings.gstin)}</div>` : "";
  const address = settings.storeAddress
    ? `<div class="muted">${esc(settings.storeAddress)}</div>`
    : "";
  const upi = data.upiRef ? `<div class="muted">UPI Ref: ${esc(data.upiRef)}</div>` : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(data.invoice)}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: ${widthMm}mm; margin: 0; padding: 4mm 3mm; font-family: "Courier New", monospace; color: #000; font-size: 12px; line-height: 1.4; }
  .center { text-align: center; }
  .store { font-size: 16px; font-weight: 800; }
  .muted { font-size: 11px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  td.qty { width: 22px; }
  td.amt { text-align: right; white-space: nowrap; padding-left: 6px; }
  .totals td { padding: 1px 0; }
  .totals .amt { text-align: right; }
  .grand td { font-weight: 800; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; }
  .foot { margin-top: 8px; text-align: center; font-size: 11px; }
  svg { max-width: 100%; }
  .print-btn { display: block; width: 100%; margin: 10px 0; padding: 8px; background: #000; color: #fff; border: none; font-weight: 700; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="center">
    <div class="store">${esc(settings.storeName || "HOMIQLO")}</div>
    ${address}
    ${gstin}
  </div>
  <hr />
  <div class="muted">Invoice: ${esc(data.invoice)}</div>
  <div class="muted">${esc(data.dateTime)}</div>
  <div class="muted">Cashier: ${esc(data.cashier)}</div>
  <hr />
  <table>${rows}</table>
  <hr />
  <table class="totals">
    <tr><td>Subtotal</td><td class="amt">${rupee(data.subtotal)}</td></tr>
    <tr><td>Discount (${settings.discountRate}%)</td><td class="amt">-${rupee(data.discount)}</td></tr>
    <tr><td>GST (${settings.gstRate}%)</td><td class="amt">${rupee(data.gst)}</td></tr>
    <tr class="grand"><td>TOTAL</td><td class="amt">${rupee(data.total)}</td></tr>
  </table>
  <hr />
  <div class="muted">Paid via ${esc(data.paymentMode)}</div>
  ${upi}
  <div class="center" style="margin-top:8px;">${invoiceBarcode}</div>
  <div class="foot">${esc(settings.receiptFooter || "Thank you!")}</div>
  <button class="print-btn" onclick="window.print()">Print</button>
  <script>
    // Auto-open the print dialog; with Chrome --kiosk-printing this prints silently.
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", `width=380,height=640`);
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
