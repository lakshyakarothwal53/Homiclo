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
  /** Sum of taxable values (net of GST when prices are inclusive). */
  taxableTotal?: number;
  /** Per-rate tax breakdown; when absent the bill falls back to one flat line. */
  gstBreakdown?: { rate: number; taxable: number; tax: number }[];
  mrpTotal?: number;
  mrpSavings?: number;
  customerName?: string;
  customerMobile?: string;
  customerDob?: string;
  customerGstin?: string;
  invoiceDate?: string;
};

// Browser rasterises the print job, so the ₹ glyph renders fine on the thermal roll.
const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;
// GST halves can be fractional (e.g. ₹4.50), so show paise only when needed.
const rupeeExact = (n: number) =>
  `₹${Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toFixed(2)}`;
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

  // Each line shows its MRP (struck through when it beats the selling price)
  // and its own GST rate, so a mixed-slab bill is self-explanatory.
  const rows = data.lines
    .map((l) => {
      const detail: string[] = [];
      if (l.mrp && l.mrp > l.unitPrice) {
        detail.push(`MRP <s>${rupee(l.mrp)}</s> → ${rupee(l.unitPrice)}`);
      } else if (l.mrp) {
        detail.push(`MRP ${rupee(l.mrp)}`);
      }
      if (l.gstRate !== undefined) detail.push(`GST ${l.gstRate}%`);
      const sub = detail.length
        ? `<tr><td></td><td class="nm muted sm" colspan="2">${detail.join(" · ")}</td></tr>`
        : "";
      return `<tr>
        <td class="qty">${l.qty}×</td>
        <td class="nm">${esc(l.name)}</td>
        <td class="amt">${rupee(l.lineTotal)}</td>
      </tr>${sub}`;
    })
    .join("");

  // GST is split into equal CGST + SGST halves, one pair per slab present in
  // the cart. Falls back to the flat POS rate for older receipts with no
  // breakdown.
  const slabs =
    data.gstBreakdown && data.gstBreakdown.length > 0
      ? data.gstBreakdown
      : [{ rate: settings.gstRate, taxable: data.subtotal - data.discount, tax: data.gst }];
  const gstRows = slabs
    .flatMap((b) => {
      const half = b.tax / 2;
      const halfRate = b.rate / 2;
      return [
        `<tr><td>CGST ${halfRate}%</td><td class="amt">${rupeeExact(half)}</td></tr>`,
        `<tr><td>SGST ${halfRate}%</td><td class="amt">${rupeeExact(half)}</td></tr>`,
      ];
    })
    .join("");

  // Prices are GST-inclusive, so the tax is already inside the total; the bill
  // shows the extracted taxable value that the CGST/SGST split adds back onto.
  const taxableValue =
    data.taxableTotal ?? (data.gstBreakdown ?? []).reduce((s, b) => s + b.taxable, 0);
  const taxableRow = `<tr><td>Taxable Value</td><td class="amt">${rupee(taxableValue)}</td></tr>`;

  const savingsRow =
    data.mrpSavings && data.mrpSavings > 0
      ? `<tr><td colspan="2" class="center">You saved ${rupee(data.mrpSavings)} on MRP</td></tr>`
      : "";

  // Store logo, printed above the store name. Only data: URIs are accepted —
  // an http(s) src frequently hasn't finished loading when print() fires on
  // the popup, which silently prints a blank space where the logo should be.
  const logo =
    settings.logoDataUrl && settings.logoDataUrl.startsWith("data:")
      ? `<img class="logo" src="${settings.logoDataUrl}" alt="" />`
      : "";

  const gstin = settings.gstin ? `<div class="muted">GSTIN: ${esc(settings.gstin)}</div>` : "";
  const address = settings.storeAddress
    ? `<div class="muted">${esc(settings.storeAddress)}</div>`
    : "";
  const upi = data.upiRef ? `<div class="muted">UPI Ref: ${esc(data.upiRef)}</div>` : "";

  // Customer block — only rendered when at least a name is present.
  const customerRows = [
    data.customerName ? `<div class="muted">Customer: ${esc(data.customerName)}</div>` : "",
    data.customerMobile ? `<div class="muted">Mobile: ${esc(data.customerMobile)}</div>` : "",
    data.customerDob ? `<div class="muted">DOB: ${esc(data.customerDob)}</div>` : "",
    data.customerGstin ? `<div class="muted">Customer GST: ${esc(data.customerGstin)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");
  const customer = customerRows ? `<hr />${customerRows}` : "";

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
  /* Capped so a large upload can't push the whole bill down the roll.
     print-color-adjust keeps the artwork from being dropped by the browser's
     "background graphics off" default. */
  .logo { display: block; margin: 0 auto 4px; max-width: 100%; max-height: 22mm; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .muted { font-size: 11px; }
  .sm { font-size: 10px; }
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
    ${logo}
    <div class="store">${esc(settings.storeName || "HOMIQLO")}</div>
    ${address}
    ${gstin}
  </div>
  <hr />
  <div class="muted">Invoice: ${esc(data.invoice)}</div>
  ${data.invoiceDate ? `<div class="muted">Invoice Date: ${esc(data.invoiceDate)}</div>` : ""}
  <div class="muted">${esc(data.dateTime)}</div>
  <div class="muted">Cashier: ${esc(data.cashier)}</div>
  ${customer}
  <hr />
  <table>${rows}</table>
  <hr />
  <table class="totals">
    <tr><td>Subtotal</td><td class="amt">${rupee(data.subtotal)}</td></tr>
    <tr><td>Discount</td><td class="amt">-${rupee(data.discount)}</td></tr>
    ${taxableRow}
    ${gstRows}
    <tr class="grand"><td>TOTAL</td><td class="amt">${rupee(data.total)}</td></tr>
    ${savingsRow}
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
