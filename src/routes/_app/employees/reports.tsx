import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { useEmployeeReports } from "@/hooks/use-employees";
import { buildTablePdf, downloadPdf, openPdf } from "@/lib/pdf-utils";
import {
  fetchMonthlyPayroll,
  fetchPerformanceReview,
  fetchEmployeeActivityReport,
  fetchReportData,
} from "@/lib/report-data";
import type { ReportData } from "@/lib/report-data";

// Pick the live dataset a report renders from, based on its name — each
// heading gets the calculator that actually matches it, not a generic
// category dump: Payroll → base salary × attendance; Performance Review →
// attendance-based ranking (fetchPerformanceReview); Activity Report → the
// real employee_activity log (same table Activity Tracking reads); Sales →
// billing data; anything else falls back to the plain employee roster.
async function fetchForReport(reportName: string): Promise<ReportData> {
  if (/payroll/i.test(reportName)) return fetchMonthlyPayroll();
  if (/performance review/i.test(reportName)) return fetchPerformanceReview();
  if (/activity/i.test(reportName)) return fetchEmployeeActivityReport();
  if (/sales/i.test(reportName)) return fetchReportData("sales");
  return fetchReportData("employee");
}

async function buildReportPdf(reportName: string, period: string) {
  const data = await fetchForReport(reportName);
  if (data.rows.length === 0) throw new Error("No live data available for this report.");
  return buildTablePdf({ title: reportName, subtitle: period, ...data });
}

export const Route = createFileRoute("/_app/employees/reports")({
  head: () => ({
    meta: [
      { title: "Employee Reports — HOMIQLO" },
      { name: "description", content: "Generated employee reports and analytics." },
    ],
  }),
  component: ReportsPage,
});

const ITEMS_PER_PAGE = 10;

export function ReportsPage() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data = [], isLoading } = useEmployeeReports();

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleView = async (reportName: string, period: string) => {
    try {
      openPdf(await buildReportPdf(reportName, period));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report.");
    }
  };

  const handleDownload = async (reportName: string, period: string) => {
    try {
      downloadPdf(
        await buildReportPdf(reportName, period),
        reportName.toLowerCase().replace(/\s+/g, "-"),
      );
      toast.success(`Downloaded "${reportName}".`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download report.");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title="Reports"
        description="Generated employee reports and analytics."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Reports</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-[color:var(--success)]">
              {data.filter((r) => r.status === "Available").length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current Period</p>
            <p className="text-lg font-medium">
              {new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Report Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading reports...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No reports available
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((report) => (
                    <TableRow key={report.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{report.report}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.period}
                      </TableCell>
                      <TableCell className="text-sm">{report.generated}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            report.status === "Available"
                              ? "bg-[color:var(--success)] text-white"
                              : "bg-gray-200 text-gray-800"
                          }
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleView(report.report, report.period)}
                          >
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleDownload(report.report, report.period)}
                          >
                            <Download className="h-4 w-4" /> Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, data.length)} of{" "}
                {data.length} reports
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={currentPage === page ? "bg-brand text-brand-foreground" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
