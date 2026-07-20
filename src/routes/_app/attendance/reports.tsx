import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
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
import { Download, Eye, FileText, RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useAttendanceReports,
  useCreateAttendanceReport,
  useDeleteAttendanceReport,
} from "@/hooks/use-attendance";
import { buildTablePdf, downloadCsv, downloadPdf, openPdf } from "@/lib/pdf-utils";
import {
  fetchReportData,
  fetchWeeklyAttendanceSummary,
  fetchMonthlyAttendanceSummary,
  fetchQuarterlyAttendanceSummary,
  fetchAnnualAttendanceSummary,
  fetchAttendanceSummary,
  attendancePeriodLabel,
  type ReportData,
} from "@/lib/report-data";

// Custom-range reports embed their exact bounds in the stored period label
// ("Custom · 2026-07-01 to 2026-07-15") since, unlike the preset periods,
// there's no "last completed X" rule to recompute them from at download time.
const CUSTOM_RANGE_RE = /(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/;

// Shared by handleView/handleDownload so both always agree on which
// calculator a report name maps to. Returns null when a Custom report's
// bounds can't be parsed back out of its stored period label.
async function fetchDataForReport(
  reportName: string,
  periodLabel: string,
  branch?: string,
): Promise<ReportData | null> {
  if (reportName === "Weekly Attendance Summary") return fetchWeeklyAttendanceSummary(branch);
  if (reportName === "Monthly Attendance Summary") return fetchMonthlyAttendanceSummary(branch);
  if (reportName === "Quarterly Attendance Summary") return fetchQuarterlyAttendanceSummary(branch);
  if (reportName === "Annual Attendance Summary") return fetchAnnualAttendanceSummary(branch);
  if (reportName === "Custom Attendance Summary") {
    const match = CUSTOM_RANGE_RE.exec(periodLabel);
    if (!match) return null;
    return fetchAttendanceSummary(branch, match[1], match[2]);
  }
  return fetchReportData("attendance", { branch });
}

export const Route = createFileRoute("/_app/attendance/reports")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — HOMIQLO" },
      {
        name: "description",
        content: "Downloadable summaries across periods.",
      },
    ],
  }),
  component: Page,
});

export function Page() {
  const { role, user } = useAuth();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [format, setFormat] = useState("pdf");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { data: reports = [], isLoading, refetch } = useAttendanceReports(search);
  const createReport = useCreateAttendanceReport(user?.branch);
  const deleteReport = useDeleteAttendanceReport();
  const isGenerating = createReport.isPending;

  const handleDelete = (id: string, reportName: string) => {
    deleteReport.mutate(id, {
      onSuccess: () => toast.success(`${reportName} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete report."),
    });
  };

  // Filter reports by branch for non-super-admin users
  // Branch Admin cannot see "Branch-wise Attendance" report
  const isSuperAdmin = role === "super_admin";
  const userBranch = user?.branch;
  const filteredReports = isSuperAdmin
    ? reports
    : reports.filter(
        (r) => (!r.branch || r.branch === userBranch) && r.reportName !== "Branch-wise Attendance",
      );

  const getFormatBadge = (format: string) => {
    if (format === "PDF") {
      return "bg-red-100 text-red-700";
    }
    return "bg-green-100 text-green-700";
  };

  const handleGenerateReport = () => {
    if (period === "custom") {
      if (!fromDate || !toDate) {
        toast.error("Pick both a from date and a to date.");
        return;
      }
      if (fromDate > toDate) {
        toast.error("From date must be before the to date.");
        return;
      }
      const fromLabel = new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const toLabel = new Date(`${toDate}T00:00:00`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      createReport.mutate(
        {
          reportName: "Custom Attendance Summary",
          period: `Custom · ${fromLabel} - ${toLabel} (${fromDate} to ${toDate})`,
          format: format.toUpperCase(),
        },
        {
          onSuccess: (r) => toast.success(`${r.reportName} generated (${r.format}).`),
          onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate report"),
        },
      );
      return;
    }

    // Every preset period reports its last COMPLETED span, never the current
    // still-in-progress one — see attendancePeriodLabel / fetch*AttendanceSummary.
    const periodLabel = attendancePeriodLabel(
      period as "weekly" | "monthly" | "quarterly" | "annual",
    );
    createReport.mutate(
      {
        reportName: `${period.charAt(0).toUpperCase()}${period.slice(1)} Attendance Summary`,
        period: periodLabel,
        format: format.toUpperCase(),
      },
      {
        onSuccess: (r) => toast.success(`${r.reportName} generated (${r.format}).`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate report"),
      },
    );
  };

  const handleDownload = async (
    reportName: string,
    reportFormat: string,
    periodLabel: string,
    branch?: string,
  ) => {
    try {
      const data = await fetchDataForReport(reportName, periodLabel, branch);
      if (!data) {
        toast.error("Could not read this report's date range.");
        return;
      }
      if (data.rows.length === 0) {
        toast.error("No attendance data available.");
        return;
      }
      const filename = reportName.toLowerCase().replace(/\s+/g, "-");
      if (reportFormat.toUpperCase() === "PDF") {
        downloadPdf(buildTablePdf({ title: reportName, subtitle: periodLabel, ...data }), filename);
      } else {
        downloadCsv(filename, data.columns, data.rows);
      }
      toast.success(`Downloaded ${reportName}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download report.");
    }
  };

  // Always previews as PDF regardless of the row's own stored format (Excel
  // rows still get a readable on-screen preview before download).
  const handleView = async (reportName: string, periodLabel: string, branch?: string) => {
    try {
      const data = await fetchDataForReport(reportName, periodLabel, branch);
      if (!data) {
        toast.error("Could not read this report's date range.");
        return;
      }
      if (data.rows.length === 0) {
        toast.error("No attendance data available.");
        return;
      }
      openPdf(buildTablePdf({ title: reportName, subtitle: periodLabel, ...data }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report.");
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Reports refreshed");
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Reports"
        title="Attendance Reports"
        description="Downloadable summaries across periods."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  <Download className="h-4 w-4" /> Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Attendance Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="period" className="text-sm font-medium">
                      Period
                    </Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="mt-1 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {period === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="from-date" className="text-sm font-medium">
                          From Date
                        </Label>
                        <Input
                          id="from-date"
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="mt-1 h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="to-date" className="text-sm font-medium">
                          To Date
                        </Label>
                        <Input
                          id="to-date"
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="mt-1 h-10"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="format" className="text-sm font-medium">
                      Format
                    </Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger className="mt-1 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Available Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search reports by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10">Report Name</TableHead>
                  <TableHead className="h-10">Period</TableHead>
                  <TableHead className="h-10">Generated On</TableHead>
                  <TableHead className="h-10">Format</TableHead>
                  <TableHead className="h-10">Status</TableHead>
                  <TableHead className="h-10 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {!isSuperAdmin ? "No reports found for your branch." : "No reports found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/50">
                      <TableCell className="py-3 font-medium">{report.reportName}</TableCell>
                      <TableCell className="py-3 text-sm">{report.period}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {report.generatedOn}
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getFormatBadge(report.format)}`}
                        >
                          {report.format}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {report.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() =>
                              handleView(
                                report.reportName,
                                report.period,
                                isSuperAdmin ? undefined : userBranch,
                              )
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() =>
                              handleDownload(
                                report.reportName,
                                report.format,
                                report.period,
                                isSuperAdmin ? undefined : userBranch,
                              )
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{report.reportName}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the report entry from the list. This can't be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                                  onClick={() => handleDelete(report.id, report.reportName)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredReports.length} {!isSuperAdmin && userBranch ? `reports for ${userBranch}` : "reports"}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
