import { Download, Plus, Search, type LucideIcon } from "lucide-react";

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
import { PRICE_RANGES, type PriceRange, type PriceSort } from "./price-filter";

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  primaryLabel = "Add New",
  primaryIcon: PrimaryIcon = Plus,
  onPrimary,
  onExport,
  branches,
  branch,
  onBranchChange,
  priceSort,
  onPriceSortChange,
  priceRange,
  onPriceRangeChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  primaryLabel?: string;
  primaryIcon?: LucideIcon;
  onPrimary?: () => void;
  onExport?: () => void;
  /** When `onBranchChange` is provided the branch select becomes controlled. */
  branches?: string[];
  branch?: string;
  onBranchChange?: (value: string) => void;
  /** When `onPriceSortChange` is provided the price controls replace the date input. */
  priceSort?: PriceSort;
  onPriceSortChange?: (value: PriceSort) => void;
  priceRange?: PriceRange;
  onPriceRangeChange?: (value: PriceRange) => void;
}) {
  return (
    <Card className="mb-4 border-border">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9 bg-background"
          />
        </div>

        {onBranchChange ? (
          <Select value={branch ?? "all"} onValueChange={onBranchChange}>
            <SelectTrigger className="h-9 w-full md:w-44">
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
        ) : (
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-full md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="bandra">Bandra</SelectItem>
              <SelectItem value="andheri">Andheri</SelectItem>
              <SelectItem value="powai">Powai</SelectItem>
            </SelectContent>
          </Select>
        )}

        {onPriceSortChange ? (
          <>
            <Select
              value={priceSort ?? "none"}
              onValueChange={(v) => onPriceSortChange(v as PriceSort)}
            >
              <SelectTrigger className="h-9 w-full md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sort: Default</SelectItem>
                <SelectItem value="low">Price: Low → High</SelectItem>
                <SelectItem value="high">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priceRange ?? "all"}
              onValueChange={(v) => onPriceRangeChange?.(v as PriceRange)}
            >
              <SelectTrigger className="h-9 w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <Input type="date" className="h-9 w-full bg-background md:w-44" />
        )}

        <div className="flex items-center gap-2 md:ml-auto">
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={onPrimary}
          >
            <PrimaryIcon className="h-4 w-4" /> {primaryLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
