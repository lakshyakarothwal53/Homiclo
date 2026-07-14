import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOT_CLASS, TONE_CLASS, statusTone } from "./StatusBadge";
import { REFUND_STATUSES } from "./NewRefundDialog";

/** A `StatusBadge`-styled dropdown so a refund's status can be changed right
 * from the Refund Management table instead of only being set once at
 * creation. */
export function RefundStatusSelect({
  status,
  onChange,
  disabled,
}: {
  status: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}) {
  const tone = statusTone(status);
  return (
    <Select value={status} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-auto w-auto gap-1.5 rounded-full border-0 px-2.5 py-0.5 text-xs font-medium shadow-none focus:ring-1 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-70",
          TONE_CLASS[tone],
        )}
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASS[tone])} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REFUND_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
