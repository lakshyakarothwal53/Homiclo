import { useMemo, useState } from "react";
import { Download, Eye, Plus, Search } from "lucide-react";
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
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { cn } from "@/lib/utils";
import { useCreateReport, useReportBranches, useReports } from "@/hooks/use-reports";
import { buildTablePdf, downloadCsv, downloadPdf, openPdf } from "@/lib/pdf-utils";
import { fetchNamedReport, fetchReportData, matchesDate } from "@/lib/report-data";
import type { ReportCategory, ReportRow } from "@/types/reports";

const PAGE_SIZE = 8;

const ADD_REPORT_FIELDS: EntityField[] = [
  { key: "name", label: "Report Name", required: true, placeholder: "Weekly Summary" },
  {
    key: "type",
    label: "Type",
    type: "select",
    options: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "Custom"],
    required: true,
  },
  { key: "period", label: "Period", required: true, placeholder: "Jul 2026" },
];

const longDate = (d: Date) =>
  `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;

export function ReportListPage({
  eyebrow,
  title,
  description,
  category,
}: {
  eyebrow: string;
  title: string;
  description: string;
  category: ReportCategory;
}) {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<string>("All Branches");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const { data: rows = [] } = useReports(category, branch);
  const { data: branches = [] } = useReportBranches();
  const createReport = useCreateReport(category);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)) &&
        matchesDate(date, r.generated, r.period),
    );
  }, [query, date, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const reportOpts = () => ({
    branch: branch === "All Branches" ? undefined : branch,
  });

  async function handleExport() {
    try {
      const data = await fetchReportData(category, reportOpts());
      if (data.rows.length === 0) {
        toast.error("No live data to export for this category.");
        return;
      }
      downloadCsv(`${category}-report-export`, data.columns, data.rows);
      toast.success(`Exported ${data.rows.length} rows of live ${category} data.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    }
  }

  async function buildRowPdf(r: ReportRow) {
    const data = await fetchNamedReport(category, r.name, reportOpts());
    if (data.rows.length === 0) {
      throw new Error("No live data available for this report.");
    }
    return buildTablePdf({ title: r.name, subtitle: `${r.type} · ${r.period}`, ...data });
  }

  async function handleView(r: ReportRow) {
    try {
      openPdf(await buildRowPdf(r));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report.");
    }
  }

  async function handleDownload(r: ReportRow) {
    try {
      downloadPdf(await buildRowPdf(r), r.name.toLowerCase().replace(/\s+/g, "-"));
      toast.success(`Downloaded "${r.name}".`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download report.");
    }
  }

  function handleAdd(v: EntityValues) {
    createReport.mutate(
      {
        name: String(v.name),
        type: String(v.type),
        period: String(v.period),
        generated: longDate(new Date()),
        size: "—",
      },
      {
        onSuccess: () => toast.success(`Report "${v.name}" added.`),
        onError: (e) =>
          toast.error(
            e instanceof Error
              ? `${e.message} — run supabase/13_completion_pack.sql to enable report writes.`
              : "Could not add report.",
          ),
      },
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
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add New
            </Button>
          </>
        }
      />

      <EntityFormDialog
        mode="add"
        title={`New ${title}`}
        description="Register a report; View/Download always render it from live data."
        fields={ADD_REPORT_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
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
            <SelectItem value="All Branches">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          className="sm:w-44"
        />
        {!!date && (
          <Button variant="ghost" size="sm" onClick={() => setDate("")}>
            Clear date
          </Button>
        )}
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
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleView(r)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDownload(r)}
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
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
