import { Search, Download, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AMOUNT_RANGES, type AmountRange, type AmountSort } from "./amount-filter";

const BRANCHES = ["All Branches", "Bandra", "Andheri", "Powai", "Worli"];

export function FilterBar({
  searchPlaceholder = "Search...",
  addLabel = "Add New",
  onAdd,
  showBranch = true,
  showDate = true,
  search,
  onSearchChange,
  onExport,
  amountSort,
  onAmountSortChange,
  amountRange,
  onAmountRangeChange,
}: {
  searchPlaceholder?: string;
  addLabel?: string;
  onAdd?: () => void;
  showBranch?: boolean;
  showDate?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  onExport?: () => void;
  /** When `onAmountSortChange` is provided, amount controls replace the date input. */
  amountSort?: AmountSort;
  onAmountSortChange?: (value: AmountSort) => void;
  amountRange?: AmountRange;
  onAmountRangeChange?: (value: AmountRange) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {showBranch && (
          <Select defaultValue="All Branches">
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {onAmountSortChange ? (
          <>
            <Select
              value={amountSort ?? "none"}
              onValueChange={(v) => onAmountSortChange(v as AmountSort)}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sort: Default</SelectItem>
                <SelectItem value="low">Amount: Low → High</SelectItem>
                <SelectItem value="high">Amount: High → Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={amountRange ?? "all"}
              onValueChange={(v) => onAmountRangeChange?.(v as AmountRange)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMOUNT_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          showDate && <Input type="date" className="w-[160px]" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button
          size="sm"
          onClick={onAdd}
          className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      </div>
    </div>
  );
}
