import type { ReactNode } from "react";
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
import { BRANCHES } from "./types";

export function DiscountToolbar({
  query,
  onQuery,
  branch,
  onBranch,
  date,
  onDate,
  onExport,
  addLabel = "Add New",
  addSlot,
}: {
  query: string;
  onQuery: (v: string) => void;
  branch: string;
  onBranch: (v: string) => void;
  date: string;
  onDate: (v: string) => void;
  onExport: () => void;
  addLabel?: string;
  /** Replaces the default Add button — e.g. a Dialog trigger. */
  addSlot?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search…"
          className="h-9 bg-card pl-9"
        />
      </div>

      <Select value={branch} onValueChange={onBranch}>
        <SelectTrigger className="h-9 w-full bg-card sm:w-40">
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

      <Input
        type="date"
        value={date}
        onChange={(e) => onDate(e.target.value)}
        className="h-9 w-full bg-card sm:w-44"
      />

      <div className="flex items-center gap-2 sm:ml-auto">
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={onExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
        {addSlot ?? (
          <Button size="sm" className="h-9 gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
