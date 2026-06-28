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

const BRANCHES = ["All Branches", "Bandra", "Andheri", "Powai", "Worli"];

export function FilterBar({
  searchPlaceholder = "Search...",
  addLabel = "Add New",
  onAdd,
  showBranch = true,
  showDate = true,
}: {
  searchPlaceholder?: string;
  addLabel?: string;
  onAdd?: () => void;
  showBranch?: boolean;
  showDate?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={searchPlaceholder} className="pl-9" />
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
        {showDate && <Input type="date" className="w-[160px]" />}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
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
