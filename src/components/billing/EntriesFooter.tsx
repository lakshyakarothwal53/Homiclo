import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function EntriesFooter({
  shown,
  total,
  pages = 3,
  current = 1,
}: {
  shown: number;
  total: number;
  pages?: number;
  current?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        Showing 1–{shown} of {total} entries
      </span>
      <div className="flex items-center gap-1">
        <button
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary disabled:opacity-40"
          disabled={current === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md text-sm font-medium transition",
              p === current
                ? "bg-brand text-brand-foreground"
                : "border border-border text-foreground hover:bg-secondary",
            )}
          >
            {p}
          </button>
        ))}
        <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
