import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/hooks/use-pagination";

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
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
        ))}
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
