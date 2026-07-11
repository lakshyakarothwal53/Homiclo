import type { Product } from "@/types/inventory";
import type { BillingPayment, BillingSalesBill } from "@/types/billing";

export function exportProductsToCSV(products: Product[], filename = "products.csv") {
  const headers = ["SKU", "Product", "Category", "Price (₹)", "Stock", "Minimum Stock", "Status"];

  const rows = products.map((p) => [
    p.sku,
    p.name,
    p.category,
    p.price.toString(),
    p.stock.toString(),
    p.minStock.toString(),
    p.status,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          if (cell.includes(",") || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(","),
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadPaymentReceipt(payment: BillingPayment) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${payment.receipt}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; padding: 40px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FE0000; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 800; color: #FE0000; }
  .title { font-size: 16px; color: #555; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  td.label { color: #666; width: 40%; }
  td.value { font-weight: 600; text-align: right; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #dcfce7; color: #16a34a; font-weight: 600; font-size: 13px; }
  .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">HOMIQLO</div>
      <div class="title">Payment Receipt</div>
    </div>
    <div class="status">${payment.status}</div>
  </div>
  <table>
    <tr><td class="label">Receipt No.</td><td class="value">${payment.receipt}</td></tr>
    <tr><td class="label">Date</td><td class="value">${payment.date}</td></tr>
    <tr><td class="label">Customer</td><td class="value">${payment.customer}</td></tr>
    <tr><td class="label">Invoice No.</td><td class="value">${payment.invoice}</td></tr>
    <tr><td class="label">Payment Mode</td><td class="value">${payment.mode}</td></tr>
    <tr><td class="label">Amount</td><td class="value">${payment.amount}</td></tr>
  </table>
  <div class="footer">This is a system-generated receipt from HOMIQLO Super Admin.</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${payment.receipt}.html`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function viewSalesBillInvoice(bill: BillingSalesBill) {
  const statusColors: Record<string, string> = {
    Paid: "background: #dcfce7; color: #16a34a;",
    Pending: "background: #fef3c7; color: #b45309;",
    Refunded: "background: #fee2e2; color: #dc2626;",
  };
  const statusStyle = statusColors[bill.status] ?? "background: #f1f5f9; color: #475569;";

  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
  const detailRow = (label: string, value?: string) =>
    value ? `<tr><td class="label">${label}</td><td class="value">${esc(value)}</td></tr>` : "";
  const customerRows =
    detailRow("Mobile", bill.customerMobile) +
    detailRow("Date of Birth", bill.customerDob) +
    detailRow("Customer GST", bill.customerGstin);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${bill.invoice}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; padding: 40px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FE0000; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 800; color: #FE0000; }
  .title { font-size: 16px; color: #555; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  td.label { color: #666; width: 40%; }
  td.value { font-weight: 600; text-align: right; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; ${statusStyle} }
  .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
  .print-btn { margin-top: 24px; padding: 8px 16px; background: #FE0000; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">HOMIQLO</div>
      <div class="title">Sales Invoice</div>
    </div>
    <div class="status">${bill.status}</div>
  </div>
  <table>
    <tr><td class="label">Invoice No.</td><td class="value">${bill.invoice}</td></tr>
    <tr><td class="label">Date</td><td class="value">${bill.date}</td></tr>
    <tr><td class="label">Customer</td><td class="value">${bill.customer}</td></tr>
    ${customerRows}
    <tr><td class="label">Payment Mode</td><td class="value">${bill.payment}</td></tr>
    <tr><td class="label">Amount</td><td class="value">${bill.amount}</td></tr>
  </table>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="footer">This is a system-generated invoice from HOMIQLO Super Admin.</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
