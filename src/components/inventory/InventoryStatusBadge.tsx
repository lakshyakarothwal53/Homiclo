import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "brand";

const TONE_MAP: Record<string, Tone> = {
  "In Stock": "success",
  "Low Stock": "warning",
  Low: "warning",
  "Out of Stock": "brand",
  Critical: "brand",
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning)]",
  brand: "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand",
};

export function InventoryStatusBadge({ status }: { status: string }) {
  const tone = TONE_MAP[status] ?? "brand";
  return (
    <Badge variant="secondary" className={cn("gap-1.5 border-transparent", TONE_CLASS[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
