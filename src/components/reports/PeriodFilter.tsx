import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PeriodOption = { key: string; from?: string; to?: string; label: string };

/**
 * Month+year options spanning the current and previous calendar year, plus
 * "All time". Covers both directions because this app's un-yeared seed dates
 * (e.g. "12 Nov") are parsed as the *current* year — which can land in the
 * future relative to "today" depending on what month the seed data assumes.
 */
export function buildPeriodOptions(): PeriodOption[] {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const options: PeriodOption[] = [
    { key: "today", from: todayIso, to: todayIso, label: "Today" },
    { key: "all", label: "All time" },
  ];
  for (let yearOffset = 0; yearOffset >= -1; yearOffset--) {
    const year = now.getFullYear() + yearOffset;
    for (let m = 11; m >= 0; m--) {
      const from = `${year}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, m + 1, 0).getDate();
      const to = `${year}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const label = new Date(year, m, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      options.push({ key: `${year}-${m + 1}`, from, to, label });
    }
  }
  return options;
}

const OPTIONS = buildPeriodOptions();

/** Month+year picker for scoping a downloaded/exported report's data range. */
export function PeriodFilter({
  value,
  onChange,
  className,
  excludeFuture,
}: {
  value: string;
  onChange: (option: PeriodOption) => void;
  className?: string;
  /**
   * Drop months after the current one. Off by default because the shared
   * OPTIONS list intentionally covers un-yeared seed dates (e.g. "12 Nov")
   * that can land in the future relative to "today"; only turn this on for
   * pages backed by real, correctly-yeared dates (e.g. attendance history),
   * where a future month can never have data.
   */
  excludeFuture?: boolean;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const options = excludeFuture ? OPTIONS.filter((o) => !o.from || o.from <= todayIso) : OPTIONS;
  return (
    <Select
      value={value}
      onValueChange={(key) => {
        const opt = options.find((o) => o.key === key) ?? options[0];
        onChange(opt);
      }}
    >
      <SelectTrigger className={className ?? "h-9 w-full sm:w-48"}>
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="All time" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
