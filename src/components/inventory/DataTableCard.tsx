import type { ReactNode } from "react";

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
}: {
  columns: Column[];
  isLoading?: boolean;
  count: number;
  children: ReactNode;
}) {
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
            children
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm sm:flex-row">
        <span className="text-muted-foreground">
          {count === 0 ? "Showing 0 entries" : `Showing 1–${count} of ${count} entries`}
        </span>
        <div className="flex items-center gap-1">
          <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary">
            ‹
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md bg-brand text-brand-foreground">
            1
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary">
            2
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary">
            3
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary">
            ›
          </button>
        </div>
      </div>
    </Card>
  );
}
