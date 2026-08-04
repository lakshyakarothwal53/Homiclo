import { Download, Plus, Search, Upload, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  searchPlaceholder = "Search…",
  primaryLabel = "Add New",
  primaryIcon: PrimaryIcon = Plus,
  onPrimary,
  onExport,
  onImport,
  branches,
  branch,
  onBranchChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  primaryLabel?: string;
  primaryIcon?: LucideIcon;
  onPrimary?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  /** When `onBranchChange` is provided the branch select becomes controlled. */
  branches?: string[];
  branch?: string;
  onBranchChange?: (value: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onMinPriceChange?: (value: number) => void;
  onMaxPriceChange?: (value: number) => void;
}) {
  return (
    <Card className="mb-4 border-border">
      <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-3 lg:gap-2">
        <div className="relative w-full md:max-w-sm flex-1 md:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 md:h-8 pl-9 bg-background text-sm"
          />
        </div>

        {/* Opt-in controlled branch select. Branch-scoped sessions omit the
            branch props entirely (their pages are pinned to one branch), so
            nothing renders — no dead dropdown implying they can switch. */}
        {onBranchChange ? (
          <Select value={branch ?? "all"} onValueChange={onBranchChange}>
            <SelectTrigger className="h-9 md:h-8 w-full sm:w-40 text-sm">
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
        ) : null}

        {onMinPriceChange && onMaxPriceChange ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice ?? ""}
              onChange={(e) => onMinPriceChange(Number(e.target.value) || 0)}
              className="h-9 md:h-8 flex-1 sm:flex-none sm:w-20 bg-background text-xs"
            />
            <span className="text-muted-foreground text-xs hidden sm:block">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice ?? ""}
              onChange={(e) => onMaxPriceChange(Number(e.target.value) || 0)}
              className="h-9 md:h-8 flex-1 sm:flex-none sm:w-20 bg-background text-xs"
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2 w-full md:ml-auto md:w-auto">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 md:h-8 text-xs flex-1 sm:flex-none"
              onClick={onExport}
              title="Export data"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
          {onImport && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 md:h-8 text-xs flex-1 sm:flex-none"
              onClick={onImport}
              title="Import data"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}
          {onPrimary && (
            <Button
              size="sm"
              className="gap-2 h-9 md:h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none"
              onClick={onPrimary}
            >
              <PrimaryIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{primaryLabel}</span>
              <span className="sm:hidden">+</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
