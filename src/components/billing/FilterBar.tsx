import { Search, Download, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  addLabel = "Add New",
  onAdd,
  onExport,
  showBranch = true,
  showDate = true,
  date,
  onDateChange,
  branches,
  branch,
  onBranchChange,
}: {
  /** When `onSearchChange` is provided the search box becomes controlled and data-driven. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  addLabel?: string;
  onAdd?: () => void;
  onExport?: () => void;
  showBranch?: boolean;
  showDate?: boolean;
  /** When `onDateChange` is provided the date input becomes controlled and data-driven. */
  date?: string;
  onDateChange?: (value: string) => void;
  /** When `onBranchChange` is provided the branch select becomes controlled and data-driven. */
  branches?: string[];
  branch?: string;
  onBranchChange?: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        {showBranch && (
          <Select value={branch ?? "all"} onValueChange={(v) => onBranchChange?.(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {(branches ?? []).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showDate && (
          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="w-[160px]"
              value={date ?? ""}
              onChange={(e) => onDateChange?.(e.target.value)}
            />
            {!!date && onDateChange && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Clear date filter"
                onClick={() => onDateChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
        )}
        {onAdd && (
          <Button
            size="sm"
            onClick={onAdd}
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
