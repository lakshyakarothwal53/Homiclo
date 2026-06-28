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
import {
  BRANCHES,
  DEPARTMENTS,
  EXPORT_FORMATS,
  REPORT_TYPES,
} from "@/components/reports/data";

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

  const branchOptions = ["All", ...BRANCHES.filter((b) => b !== "All Branches")];

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
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => toast.info(`Previewing ${reportType} report`)}
            >
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() =>
                toast.success(`Generating ${reportType} report as ${format}…`)
              }
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
