import JsBarcode from "jsbarcode";

export type BarcodeProduct = {
  sku: string;
  barcode?: string;
  name: string;
  price?: number;
};

/** Render a CODE128 barcode for a SKU and return it as an SVG markup string. */
export function barcodeSvg(sku: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, sku, {
    format: "CODE128",
    width: 2,
    height: 56,
    margin: 6,
    fontSize: 13,
    displayValue: true,
  });
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Open a print-ready window with one barcode label per product.
 * Used by Inventory (per-product / bulk) and the POS scanners.
 */
export function printBarcodes(products: BarcodeProduct[]) {
  const labels = products
    .map((p) => {
      let svg: string;
      try {
        svg = barcodeSvg(p.barcode || p.sku);
      } catch {
        return "";
      }
      const price =
        typeof p.price === "number"
          ? `<div class="price">₹${p.price.toLocaleString("en-IN")}</div>`
          : "";
      return `<div class="label">
        <div class="name">${p.name}</div>
        ${svg}
        ${price}
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>HOMIQLO — Product Barcodes</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #111; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .brand { font-size: 18px; font-weight: 800; color: #FE0000; }
  .print-btn { padding: 8px 16px; background: #FE0000; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; }
  .label { border: 1px dashed #bbb; border-radius: 8px; padding: 10px 14px; text-align: center; width: 220px; box-sizing: border-box; }
  .name { font-size: 12px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .price { font-size: 12px; font-weight: 700; margin-top: 2px; }
  svg { max-width: 100%; }
  @media print { .toolbar { display: none; } .label { break-inside: avoid; } }
</style>
</head>
<body>
  <div class="toolbar">
    <div class="brand">HOMIQLO · Barcode Labels (${products.length})</div>
    <button class="print-btn" onclick="window.print()">Print</button>
  </div>
  <div class="grid">${labels}</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
