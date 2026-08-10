import JsBarcode from "jsbarcode";

export type BarcodeProduct = {
  sku: string;
  barcode?: string;
  name: string;
  price?: number;
  mrp?: number;
};

export type BarcodeSvgOptions = {
  width?: number;
  height?: number;
  margin?: number;
  fontSize?: number;
  displayValue?: boolean;
};

/**
 * Render a CODE128 barcode for a SKU and return it as an SVG markup string.
 * Defaults match the receipt's invoice barcode; pass compact options for the
 * small 50mm product labels.
 */
export function barcodeSvg(sku: string, opts: BarcodeSvgOptions = {}): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, sku, {
    format: "CODE128",
    width: opts.width ?? 2,
    height: opts.height ?? 56,
    margin: opts.margin ?? 6,
    fontSize: opts.fontSize ?? 13,
    displayValue: opts.displayValue ?? true,
  });
  return new XMLSerializer().serializeToString(svg);
}

const esc = (s: string) =>
  s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

/** One 50mm×50mm label cell — name, barcode, price. */
function labelCell(p: BarcodeProduct): string {
  let svg: string;
  try {
    // Compact settings so a full CODE128 fits inside ~46mm.
    svg = barcodeSvg(p.barcode || p.sku, { width: 1.4, height: 34, margin: 2, fontSize: 9 });
  } catch {
    return `<div class="label"></div>`;
  }
  const price =
    typeof p.price === "number"
      ? `<div class="price">₹${p.price.toLocaleString("en-IN")}</div>`
      : "";
  return `<div class="label">
    <div class="name">${esc(p.name)}</div>
    ${svg}
    ${price}
  </div>`;
}

/**
 * Open a print-ready window with barcode labels laid out for a 2-up
 * 50mm×50mm die-cut roll (100mm-wide media, two labels per row).
 * A single product prints as 2 identical copies (fills both labels);
 * a bulk selection flows one label per product across the two columns.
 * Used by Inventory (per-product / bulk) and the POS scanners.
 */
export function printBarcodes(products: BarcodeProduct[]) {
  if (products.length === 0) return;
  // Single product → 2 copies so both labels in the row are filled.
  const cells = products.length === 1 ? [products[0], products[0]] : products;

  let rows = "";
  for (let i = 0; i < cells.length; i += 2) {
    const left = labelCell(cells[i]);
    const right = cells[i + 1] ? labelCell(cells[i + 1]) : `<div class="label empty"></div>`;
    rows += `<div class="row">${left}${right}</div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>HOMIQLO — Product Barcodes</title>
<style>
  @page { size: 100mm 50mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: -apple-system, Arial, sans-serif; color: #000; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
  .brand { font-size: 16px; font-weight: 800; color: #FE0000; }
  .print-btn { padding: 8px 16px; background: #FE0000; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
  .row { width: 100mm; height: 50mm; display: flex; }
  .label { width: 50mm; height: 50mm; padding: 1.5mm; overflow: hidden;
           display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .name { font-size: 8pt; font-weight: 600; line-height: 1.1; max-width: 100%;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1mm; }
  .price { font-size: 9pt; font-weight: 700; margin-top: 0.5mm; }
  svg { max-width: 100%; height: auto; }
  @media print {
    .toolbar { display: none; }
    .row { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <div class="brand">HOMIQLO · Barcode Labels (${products.length})</div>
    <button class="print-btn" onclick="window.print()">Print</button>
  </div>
  ${rows}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
