import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EntriesFooter } from "./EntriesFooter";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  pageSize = 8,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  pageSize?: number;
}) {
  const alignClass = (a?: Column<T>["align"]) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = useState(1);
  // Snap back into range when the row set changes (search / filter narrows it).
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-5 py-3 font-medium", alignClass(c.align), c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-16 text-center text-sm text-muted-foreground"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={rowKey(row, start + i)}
                  className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50"
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-5 py-3.5", alignClass(c.align), c.className)}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <EntriesFooter
        firstShown={total === 0 ? 0 : start + 1}
        lastShown={Math.min(start + pageSize, total)}
        total={total}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </>
  );
}
