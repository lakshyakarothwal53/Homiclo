import { JSDOM } from "jsdom";
import { createCanvas } from "canvas";
import { createClient } from "@supabase/supabase-js";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost" });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).XMLSerializer = dom.window.XMLSerializer;

// jsdom's <canvas> has no real 2D context; back it with the native `canvas`
// package so JsBarcode's text-measurement step (used when displayValue:true)
// actually works, matching what a real browser does natively.
const realCreateElement = dom.window.document.createElement.bind(dom.window.document);
dom.window.document.createElement = ((tagName: string, opts?: unknown) => {
  if (tagName.toLowerCase() === "canvas") {
    const c = createCanvas(200, 100) as unknown as HTMLCanvasElement;
    return c;
  }
  return realCreateElement(tagName, opts as never);
}) as typeof document.createElement;

let capturedHtml = "";
let openCalled = false;
dom.window.open = ((..._args: unknown[]) => {
  openCalled = true;
  return {
    document: {
      write: (html: string) => {
        capturedHtml = html;
      },
      close: () => {},
    },
  } as unknown as Window;
}) as typeof window.open;

const { barcodeSvg, printBarcodes } = await import("../src/lib/barcode-utils.ts");

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
const { data: products, error } = await supabase
  .from("products")
  .select("sku, name, price")
  .limit(1);
if (error || !products?.[0]) throw new Error(`Could not fetch a real product: ${error?.message}`);
const product = products[0];
console.log("Testing with real product:", product);

const svg = barcodeSvg(product.sku);
const svgValid =
  svg.includes("<svg") && svg.includes("</svg>") && /<rect/.test(svg) && svg.includes(product.sku);
console.log("barcodeSvg() output valid:", svgValid, `(${svg.length} chars)`);
if (!svgValid) console.log("SVG snippet:", svg.slice(0, 400));

printBarcodes([{ sku: product.sku, name: product.name, price: product.price }]);
console.log("window.open() called:", openCalled);
console.log("HTML written:", capturedHtml.length > 0);
console.log("HTML contains product name:", capturedHtml.includes(product.name));
console.log(
  "HTML contains barcode SVG:",
  capturedHtml.includes("<svg") && capturedHtml.includes(product.sku),
);
console.log(
  "HTML contains formatted price:",
  capturedHtml.includes(`₹${product.price.toLocaleString("en-IN")}`),
);
console.log("HTML contains Print button:", capturedHtml.includes("window.print()"));

const { data: many } = await supabase.from("products").select("sku, name, price").limit(5);
let bulkHtml = "";
dom.window.open = ((..._args: unknown[]) => {
  return { document: { write: (h: string) => (bulkHtml = h), close: () => {} } } as unknown as Window;
}) as typeof window.open;
printBarcodes(many ?? []);
const allSkusPresent = (many ?? []).every((p) => bulkHtml.includes(p.sku));
console.log(`Bulk print (${many?.length} products) — all SKUs present in output:`, allSkusPresent);
