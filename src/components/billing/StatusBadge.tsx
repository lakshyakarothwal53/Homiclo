import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const TONE_BY_STATUS: Record<string, Tone> = {
  // positive / settled
  paid: "success",
  received: "success",
  success: "success",
  completed: "success",
  synced: "success",
  active: "success",
  // in progress
  pending: "warning",
  processing: "warning",
  partial: "warning",
  // negative
  refunded: "danger",
  failed: "danger",
  overdue: "danger",
  cancelled: "danger",
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning)]",
  danger: "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand",
  info: "bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-[color:var(--info)]",
  muted: "bg-secondary text-muted-foreground",
};

const DOT_CLASS: Record<Tone, string> = {
  success: "bg-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]",
  danger: "bg-brand",
  info: "bg-[color:var(--info)]",
  muted: "bg-muted-foreground/50",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONE_BY_STATUS[status.toLowerCase()] ?? "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone])} />
      {status}
    </span>
  );
}
