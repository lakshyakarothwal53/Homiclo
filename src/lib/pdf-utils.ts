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

const rupee = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

export type TaxInvoiceLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

export type TaxInvoiceSummary = {
  invoice: string;
  date: string;
  gstin: string;
  taxable: string;
  cgst: string;
  sgst: string;
  total: string;
};

/** A single GST tax invoice as its own document — used by Tax Invoices'
 * View/Download actions, distinct from buildTablePdf's flat multi-row
 * export. Falls back to just the summary block when line items aren't
 * available (e.g. a branch-filtered snapshot row with no linked
 * pos_transaction_items). */
export function buildTaxInvoicePdf(
  invoice: TaxInvoiceSummary,
  lines: TaxInvoiceLine[] = [],
): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(BRAND);
  doc.setFont("helvetica", "bold");
  doc.text("HOMIQLO", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor("#111111");
  doc.text("Tax Invoice", 14, 27);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#666666");
  doc.text(`Invoice ${sanitizeForPdf(invoice.invoice)} · ${sanitizeForPdf(invoice.date)}`, 14, 33);
  doc.text(`GSTIN: ${sanitizeForPdf(invoice.gstin || "-")}`, 14, 38);

  let startY = 44;
  if (lines.length > 0) {
    autoTable(doc, {
      startY,
      head: [["Product", "Qty", "Unit Price", "Amount"]],
      body: lines.map((l) => [
        sanitizeForPdf(l.name),
        String(l.qty),
        rupee(l.unitPrice),
        rupee(l.lineTotal),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [254, 0, 0], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 246, 246] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      // columnStyles' halign only applies to body cells in this jspdf-autotable
      // version, not head cells — without this the Qty/Unit Price/Amount
      // headers stay left-aligned while their values sit right-aligned below,
      // visibly out of line. Force the same alignment on every row section.
      didParseCell: (data) => {
        if (data.column.index > 0) data.cell.styles.halign = "right";
      },
    });
    const { lastAutoTable } = doc as unknown as { lastAutoTable: { finalY: number } };
    startY = lastAutoTable.finalY + 10;
  }

  autoTable(doc, {
    startY,
    margin: { left: 116 },
    tableWidth: 80,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: { 1: { halign: "right" } },
    body: [
      ["Taxable Amount", sanitizeForPdf(invoice.taxable)],
      ["CGST", sanitizeForPdf(invoice.cgst)],
      ["SGST", sanitizeForPdf(invoice.sgst)],
      [{ content: "Total", styles: { fontStyle: "bold" } }, { content: sanitizeForPdf(invoice.total), styles: { fontStyle: "bold" } }],
    ],
  });

  return doc;
}

export type UsageReportTxn = { invoice: string; date: string; subtotal: number; discount: number; total: number };

/** A single discount code's usage report — its summary stats plus every real
 * redemption behind them, used by Usage Reports' View/Download actions. */
export function buildUsageReportPdf(
  summary: { discount: string; code: string; timesUsed: number; discountGiven: number; avgOrder: number },
  transactions: UsageReportTxn[],
): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(BRAND);
  doc.setFont("helvetica", "bold");
  doc.text("HOMIQLO", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor("#111111");
  doc.text("Discount Usage Report", 14, 27);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#666666");
  doc.text(`${sanitizeForPdf(summary.discount)} · Code ${sanitizeForPdf(summary.code)}`, 14, 33);

  autoTable(doc, {
    startY: 40,
    margin: { left: 14 },
    tableWidth: 90,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.column.index === 1) data.cell.styles.halign = "right";
    },
    body: [
      ["Times Used", String(summary.timesUsed)],
      ["Discount Given", rupee(summary.discountGiven)],
      ["Avg. Order", rupee(summary.avgOrder)],
    ],
  });

  const { lastAutoTable } = doc as unknown as { lastAutoTable: { finalY: number } };
  const startY = lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY,
    head: [["Invoice", "Date", "Subtotal", "Discount", "Total"]],
    body: transactions.map((t) => [
      sanitizeForPdf(t.invoice),
      sanitizeForPdf(t.date),
      rupee(t.subtotal),
      rupee(t.discount),
      rupee(t.total),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [254, 0, 0], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 246, 246] },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    didParseCell: (data) => {
      if (data.column.index >= 2) data.cell.styles.halign = "right";
    },
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
