import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DiscountStatus } from "./types";

const STYLES: Record<DiscountStatus, string> = {
  Active: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]",
  Upcoming: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning)]",
  Expired: "bg-secondary text-muted-foreground",
  Ended: "bg-secondary text-muted-foreground",
};

export function StatusBadge({ status }: { status: DiscountStatus }) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5", STYLES[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
