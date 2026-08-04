import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground line-clamp-2">
              {label}
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          {Icon && (
            <div className="grid h-8 sm:h-9 w-8 sm:w-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
              <Icon className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            </div>
          )}
        </div>
        {delta && (
          <div
            className={cn(
              "mt-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend === "up"
                ? "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]"
                : "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand",
            )}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
