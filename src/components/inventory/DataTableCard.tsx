import { Children, type ReactNode, useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column = { key: string; label: string; align?: "left" | "right" | "center" };

export function DataTableCard({
  columns,
  isLoading,
  count,
  children,
  pageSize = 8,
}: {
  columns: Column[];
  isLoading?: boolean;
  count: number;
  children: ReactNode;
  pageSize?: number;
}) {
  const items = Children.toArray(children);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const [page, setPage] = useState(1);
  // Snap back into range when the row set changes (e.g. a filter/search narrows it).
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const firstShown = total === 0 ? 0 : start + 1;
  const lastShown = Math.min(start + pageSize, total);

  return (
    <Card className="overflow-hidden border-border p-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/60 hover:bg-secondary/60">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "px-5 text-[11px] uppercase tracking-wider",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-t border-border">
                {columns.map((col) => (
                  <TableCell key={col.key} className="px-5 py-4">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : count === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="px-5 py-16 text-center text-sm text-muted-foreground"
              >
                No matching records found.
              </TableCell>
            </TableRow>
          ) : (
            pageItems
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm sm:flex-row">
        <span className="text-muted-foreground">
          {total === 0
            ? "Showing 0 entries"
            : `Showing ${firstShown}–${lastShown} of ${total} entries`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: pageCount }).map((_, i) => {
            const n = i + 1;
            const active = n === page;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-md",
                  active
                    ? "bg-brand text-brand-foreground"
                    : "border border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {n}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </Card>
  );
}
