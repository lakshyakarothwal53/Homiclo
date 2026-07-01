import * as XLSX from "xlsx";

/**
 * Download the given rows as a real .xlsx workbook (via SheetJS).
 * Signature mirrors `downloadCsv` in @/components/discounts/types so pages wire
 * it the same way. Pass the *filtered* rows (all matches), not just the current
 * page — export reflects the query, not the pagination window.
 */
export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
