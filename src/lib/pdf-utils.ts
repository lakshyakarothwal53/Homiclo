import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = "#FE0000";

export type PdfTable = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
};

// jsPDF's built-in fonts (helvetica/times/courier) use WinAnsiEncoding, a
// single-byte encoding standardized before the ₹ Rupee sign existed (added to
// Unicode in 2010). Any "₹" reaching jsPDF renders as a missing/blank glyph,
// silently corrupting every price in the PDF. Swap it for an ASCII-safe
// prefix everywhere text reaches the document — this is the one place all
// PDF generation in the app funnels through.
function sanitizeForPdf(value: string): string {
  return value.replace(/₹\s?/g, "Rs. ");
}

function sanitizeCell(cell: string | number): string {
  return typeof cell === "string" ? sanitizeForPdf(cell) : String(cell);
}

export function buildTablePdf({ title, subtitle, columns, rows }: PdfTable): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(BRAND);
  doc.setFont("helvetica", "bold");
  doc.text("HOMIQLO", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor("#111111");
  doc.text(sanitizeForPdf(title), 14, 27);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#666666");
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const sub = subtitle ? sanitizeForPdf(subtitle) : undefined;
  doc.text(sub ? `${sub} · Generated ${generated}` : `Generated ${generated}`, 14, 33);

  autoTable(doc, {
    startY: 38,
    head: [columns.map(sanitizeCell)],
    body: rows.map((r) => r.map(sanitizeCell)),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [254, 0, 0], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 246, 246] },
  });

  return doc;
}

/** Open the PDF in the browser's native PDF viewer (new tab). */
export function openPdf(doc: jsPDF) {
  window.open(doc.output("bloburl"), "_blank");
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
