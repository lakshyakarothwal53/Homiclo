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
      <CardContent className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-2">
        <div className="relative w-full md:max-w-sm flex-shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-9 bg-background text-sm"
          />
        </div>

        {onBranchChange ? (
          <Select value={branch ?? "all"} onValueChange={onBranchChange}>
            <SelectTrigger className="h-8 w-full md:w-32 text-sm flex-shrink-0">
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
            <SelectTrigger className="h-8 w-full md:w-32 text-sm flex-shrink-0">
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

        {onMinPriceChange && onMaxPriceChange ? (
          <div className="flex items-center gap-1 w-full md:w-auto flex-shrink-0">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice ?? ""}
              onChange={(e) => onMinPriceChange(Number(e.target.value) || 0)}
              className="h-8 w-16 bg-background md:w-20 text-xs"
            />
            <span className="text-muted-foreground text-xs">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice ?? ""}
              onChange={(e) => onMaxPriceChange(Number(e.target.value) || 0)}
              className="h-8 w-16 bg-background md:w-20 text-xs"
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1 md:ml-auto flex-shrink-0">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8 text-xs p-2.5"
              onClick={onExport}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          )}
          {onImport && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8 text-xs p-2.5"
              onClick={onImport}
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
          )}
          {onPrimary && (
            <Button
              size="sm"
              className="gap-1 h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90 p-2.5"
              onClick={onPrimary}
            >
              <PrimaryIcon className="h-3.5 w-3.5" /> {primaryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
