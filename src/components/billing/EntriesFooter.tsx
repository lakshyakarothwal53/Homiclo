import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/hooks/use-pagination";

// Windowed page list: first page, last page, the current page ± 1, and an
// ellipsis marker wherever a run of pages is skipped. Keeps the footer to a
// handful of buttons instead of one per page when a table has hundreds of rows.
function pageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  const out: (number | "ellipsis")[] = [1];
  if (left > 2) out.push("ellipsis");
  for (let p = left; p <= right; p++) out.push(p);
  if (right < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

export function EntriesFooter({
  total,
  currentPage = 1,
  totalPages = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
}: {
  total: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}) {
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        {total === 0 ? "Showing 0 entries" : `Showing ${startItem}–${endItem} of ${total} entries`}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(currentPage, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="grid h-8 w-8 place-items-center text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange?.(p)}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md text-sm font-medium transition",
                p === currentPage
                  ? "bg-brand text-brand-foreground"
                  : "border border-border text-foreground hover:bg-secondary",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
