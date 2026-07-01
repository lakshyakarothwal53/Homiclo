import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function EntriesFooter({
  firstShown,
  lastShown,
  total,
  page,
  pageCount,
  onPageChange,
}: {
  firstShown: number;
  lastShown: number;
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        {total === 0
          ? "Showing 0 entries"
          : `Showing ${firstShown}–${lastShown} of ${total} entries`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md text-sm font-medium transition",
              p === page
                ? "bg-brand text-brand-foreground"
                : "border border-border text-foreground hover:bg-secondary",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
