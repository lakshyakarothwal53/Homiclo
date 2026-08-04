import type { ReactNode } from "react";
import { useMemo } from "react";

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

const ITEMS_PER_PAGE = 10;

export function DataTableCard({
  columns,
  isLoading,
  count,
  children,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: {
  columns: Column[];
  isLoading?: boolean;
  count: number;
  children: ReactNode;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}) {
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, count);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 2) pages.push("...");
      if (currentPage > 1 && currentPage < totalPages) pages.push(currentPage);
      if (currentPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);
  return (
    <Card className="overflow-hidden border-border p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 hover:bg-secondary/60">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "px-3 sm:px-5 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap",
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
                  <TableCell key={col.key} className="px-3 sm:px-5 py-3 text-xs sm:text-sm">
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
            children
          )}
        </TableBody>
      </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-3 sm:px-5 py-3 text-xs sm:text-sm">
        <span className="text-muted-foreground">
          {count === 0
            ? "Showing 0 entries"
            : `Showing ${startItem}–${endItem} of ${count} entries`}
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="grid h-9 sm:h-8 w-9 sm:w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Previous page"
          >
            ‹
          </button>
          {pageNumbers.map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground hidden sm:block">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange?.(Number(page))}
                className={cn(
                  "grid h-9 sm:h-8 w-9 sm:w-8 place-items-center rounded-md font-medium transition text-xs sm:text-sm",
                  currentPage === page
                    ? "bg-brand text-brand-foreground"
                    : "border border-border text-muted-foreground hover:bg-secondary",
                )}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="grid h-9 sm:h-8 w-9 sm:w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </Card>
  );
}
