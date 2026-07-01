import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { exportToExcel } from "@/lib/export";
import { DiscountToolbar } from "./DiscountToolbar";
import { AddDiscountDialog } from "./AddDiscountDialog";
import { StatusBadge } from "./StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatValue,
  type DiscountValueType,
  type PromoRow,
} from "./types";

const PAGE_SIZE = 8;

export function PromoDiscountsPage({
  eyebrow,
  title,
  description,
  addLabel,
  lockType,
  initialRows,
}: {
  eyebrow: string;
  title: string;
  description: string;
  addLabel: string;
  /** Flat / Percentage pages fix the value type for new rows. */
  lockType?: DiscountValueType;
  initialRows: PromoRow[];
}) {
  const [rows, setRows] = useState<PromoRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All Branches");
  const [date, setDate] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) {
        return false;
      }
      if (date) {
        const on = new Date(date).getTime();
        if (on < new Date(r.validFrom).getTime() || on > new Date(r.validTo).getTime()) {
          return false;
        }
      }
      return true;
    });
  }, [rows, query, date]);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage((p) => Math.min(Math.max(1, p), pageCount)), [pageCount]);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function handleExport() {
    exportToExcel(
      title.toLowerCase().replace(/\s+/g, "-"),
      ["Name", "Code", "Value", "Min Order", "Valid From", "Valid To", "Used", "Status"],
      filtered.map((r) => [
        r.name,
        r.code,
        formatValue(r),
        r.minOrder,
        formatDate(r.validFrom),
        formatDate(r.validTo),
        r.used,
        r.status,
      ]),
    );
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <DiscountToolbar
        query={query}
        onQuery={setQuery}
        branch={branch}
        onBranch={setBranch}
        date={date}
        onDate={setDate}
        onExport={handleExport}
        addSlot={
          <AddDiscountDialog
            triggerLabel={addLabel}
            title={addLabel}
            lockType={lockType}
            onAdd={(row) => setRows((prev) => [row, ...prev])}
          />
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Value</th>
                  <th className="px-5 py-3 text-left font-medium">Min Order</th>
                  <th className="px-5 py-3 text-left font-medium">Valid From</th>
                  <th className="px-5 py-3 text-left font-medium">Valid To</th>
                  <th className="px-5 py-3 text-left font-medium">Used</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {r.code}
                    </td>
                    <td className="px-5 py-3.5">{formatValue(r)}</td>
                    <td className="px-5 py-3.5">{formatCurrency(r.minOrder)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(r.validFrom)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(r.validTo)}</td>
                    <td className="px-5 py-3.5">
                      {r.used}
                      {r.cap != null && <span className="text-muted-foreground"> / {r.cap}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      No discounts match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <EntriesFooter
            firstShown={filtered.length === 0 ? 0 : start + 1}
            lastShown={Math.min(start + PAGE_SIZE, filtered.length)}
            total={filtered.length}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
