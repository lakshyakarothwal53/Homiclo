import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, EXPORT_FORMATS, REPORT_TYPES } from "@/components/reports/data";
import { useReportBranches } from "@/hooks/use-reports";
import { buildTablePdf, downloadCsv, downloadPdf, openPdf } from "@/lib/pdf-utils";
import { fetchReportData } from "@/lib/report-data";
import type { ReportCategory } from "@/types/reports";

const TYPE_TO_CATEGORY: Record<string, ReportCategory> = {
  Sales: "sales",
  Attendance: "attendance",
  Employee: "employee",
  Inventory: "inventory",
  "Discount Performance": "discount",
  Financial: "financial",
};

export const Route = createFileRoute("/_app/reports/export")({
  head: () => ({
    meta: [
      { title: "Export Reports — HOMIQLO" },
      { name: "description", content: "Bulk export in CSV / Excel / PDF." },
    ],
  }),
  component: Page,
});

function Page() {
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
  const [format, setFormat] = useState<string>(EXPORT_FORMATS[0]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branch, setBranch] = useState<string>("All");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);

  const { data: branchNames = [] } = useReportBranches();
  const branchOptions = ["All", ...branchNames];

  async function loadData() {
    const category = TYPE_TO_CATEGORY[reportType] ?? "sales";
    const data = await fetchReportData(category, {
      from: fromDate || undefined,
      to: toDate || undefined,
      branch: branch === "All" ? undefined : branch,
    });
    if (data.rows.length === 0) {
      throw new Error("No data matches the selected filters.");
    }
    return data;
  }

  const subtitle = () => {
    const parts = [branch !== "All" ? branch : "All branches", department];
    if (fromDate || toDate) parts.push(`${fromDate || "…"} → ${toDate || "…"}`);
    return parts.join(" · ");
  };

  async function handlePreview() {
    try {
      const data = await loadData();
      openPdf(buildTablePdf({ title: `${reportType} Report`, subtitle: subtitle(), ...data }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed.");
    }
  }

  async function handleGenerate() {
    try {
      const data = await loadData();
      const filename = `${reportType.toLowerCase().replace(/\s+/g, "-")}-report`;
      if (format.startsWith("PDF")) {
        downloadPdf(
          buildTablePdf({ title: `${reportType} Report`, subtitle: subtitle(), ...data }),
          filename,
        );
      } else {
        // Excel opens CSV natively; keep a single robust text format.
        downloadCsv(filename, data.columns, data.rows);
      }
      toast.success(`${reportType} report generated (${data.rows.length} rows).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports › Export"
        title="Export Reports"
        description="Export overview and controls."
      />

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Report Type">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Format">
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="From Date">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>

            <Field label="To Date">
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>

            <Field label="Branch">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Department">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePreview}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={handleGenerate}
            >
              <Download className="h-4 w-4" /> Generate &amp; Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}
