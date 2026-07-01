import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import { BRANCHES, type ReportRow } from "./data";

const PAGE_SIZE = 8;

export function ReportListPage({
  eyebrow,
  title,
  description,
  rows,
}: {
  eyebrow: string;
  title: string;
  description: string;
  rows: ReportRow[];
}) {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<string>(BRANCHES[0]);
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }, [query, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function handleExport() {
    exportToExcel(
      title.toLowerCase().replace(/\s+/g, "-"),
      ["Report Name", "Type", "Period", "Generated", "Size"],
      filtered.map((r) => [r.name, r.type, r.period, r.generated, r.size]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => toast.info("Generate a new report")}
            >
              <Plus className="h-4 w-4" /> Add New
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search..."
            className="pl-9"
          />
        </div>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All Branches" />
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
          onChange={(e) => setDate(e.target.value)}
          className="sm:w-44"
        />
      </div>

      {/* Table */}
      <Card className="border-border p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-[0.12em]">Report Name</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.12em]">Type</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.12em]">Period</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.12em]">Generated</TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.12em]">Size</TableHead>
              <TableHead className="w-0 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No reports match your filters.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.type}</TableCell>
                  <TableCell className="text-muted-foreground">{r.period}</TableCell>
                  <TableCell className="text-muted-foreground">{r.generated}</TableCell>
                  <TableCell className="text-muted-foreground">{r.size}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => toast.success(`Downloading “${r.name}”`)}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? "Showing 0 entries"
              : `Showing ${start + 1}–${start + visible.length} of ${filtered.length} entries`}
          </p>
          <div className="flex items-center gap-1">
            <PagerButton
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              aria-label="Previous page"
            >
              ‹
            </PagerButton>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <PagerButton key={p} active={p === current} onClick={() => setPage(p)}>
                {p}
              </PagerButton>
            ))}
            <PagerButton
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
              aria-label="Next page"
            >
              ›
            </PagerButton>
          </div>
        </div>
      </Card>
    </>
  );
}

function PagerButton({
  children,
  active,
  disabled,
  onClick,
  ...props
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-8 min-w-8 place-items-center rounded-md border px-2 text-sm font-medium transition",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-background text-foreground hover:bg-secondary",
        disabled && "cursor-not-allowed opacity-40 hover:bg-background",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
