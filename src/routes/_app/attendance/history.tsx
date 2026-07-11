import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEmployeeAttendance } from "@/hooks/use-attendance";
import { PeriodFilter, type PeriodOption } from "@/components/reports/PeriodFilter";
import { downloadCsv } from "@/lib/pdf-utils";
import type { EmployeeAttendance } from "@/types/attendance";

export const Route = createFileRoute("/_app/attendance/history")({
  head: () => ({
    meta: [
      { title: "Employee History — HOMIQLO" },
      { name: "description", content: "Per-employee attendance timeline." },
    ],
  }),
  component: Page,
});

function EmployeeAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-cyan-500",
    "bg-pink-500",
    "bg-yellow-500",
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const sizeClasses = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  return (
    <div
      className={`${bgColor} ${sizeClasses} rounded-full flex items-center justify-center text-white font-semibold`}
    >
      {initials}
    </div>
  );
}

const CSV_HEADERS = [
  "Employee",
  "Designation",
  "Branch",
  "Present",
  "Absent",
  "Late",
  "Leave",
  "Attendance %",
];

interface BranchSummaryRow {
  branch: string;
  employees: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

// Late arrivals still attended, so attendance % = (present + late) / tracked,
// where tracked = present + late + absent (approved leave excluded).
function attendancePct(present: number, late: number, absent: number): string {
  const tracked = present + late + absent;
  return tracked > 0 ? `${(((present + late) / tracked) * 100).toFixed(2)}%` : "0.00%";
}

const toCsvRow = (emp: EmployeeAttendance): (string | number)[] => [
  emp.employeeName,
  emp.designation,
  emp.branch,
  emp.totalPresent,
  emp.totalAbsent,
  emp.totalLate,
  emp.totalLeave,
  emp.attendancePercentage,
];

function Page() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodOption>({ key: "all", label: "All time" });
  const {
    data: employees = [],
    isLoading,
    refetch,
  } = useEmployeeAttendance(search, { from: period.from, to: period.to });

  const { branchRows, branchTotal } = useMemo(() => {
    const map = new Map<string, BranchSummaryRow>();
    employees.forEach((e) => {
      const cur = map.get(e.branch) ?? {
        branch: e.branch,
        employees: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };
      cur.employees += 1;
      cur.present += e.totalPresent;
      cur.absent += e.totalAbsent;
      cur.late += e.totalLate;
      cur.leave += e.totalLeave;
      map.set(e.branch, cur);
    });
    const rows = [...map.values()].sort((a, b) => a.branch.localeCompare(b.branch));
    const total = rows.reduce<BranchSummaryRow>(
      (t, r) => ({
        branch: "All Branches",
        employees: t.employees + r.employees,
        present: t.present + r.present,
        absent: t.absent + r.absent,
        late: t.late + r.late,
        leave: t.leave + r.leave,
      }),
      { branch: "All Branches", employees: 0, present: 0, absent: 0, late: 0, leave: 0 },
    );
    return { branchRows: rows, branchTotal: total };
  }, [employees]);

  const getAttendanceColor = (percentage: string) => {
    const num = parseInt(percentage);
    if (num >= 90) return "text-green-700 bg-green-50";
    if (num >= 80) return "text-blue-700 bg-blue-50";
    if (num >= 70) return "text-orange-700 bg-orange-50";
    return "text-red-700 bg-red-50";
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Data refreshed");
  };

  const handleDownloadOne = (emp: EmployeeAttendance) => {
    downloadCsv(`attendance-${emp.employeeName.toLowerCase().replace(/\s+/g, "-")}`, CSV_HEADERS, [
      toCsvRow(emp),
    ]);
    toast.success(`Downloaded attendance for ${emp.employeeName}.`);
  };

  const handleDownloadAll = () => {
    if (employees.length === 0) {
      toast.error("Nothing to download.");
      return;
    }
    downloadCsv("attendance-history", CSV_HEADERS, employees.map(toCsvRow));
    toast.success(`Downloaded attendance for ${employees.length} employees.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Employee History"
        title="Employee History"
        description="Per-employee attendance timeline."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-brand text-brand-foreground"
              onClick={handleDownloadAll}
            >
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>
        }
      />

      <Card className="border-border mb-6">
        <CardHeader>
          <CardTitle className="text-base">Branch Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 font-semibold">Branch</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Employees</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Present</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Absent</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Late</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Leave</TableHead>
                  <TableHead className="h-12 font-semibold text-right">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : branchRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No attendance data.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {branchRows.map((b) => (
                      <TableRow key={b.branch} className="hover:bg-muted/50 border-b">
                        <TableCell className="py-4 text-sm font-medium">{b.branch}</TableCell>
                        <TableCell className="py-4 text-center text-sm">{b.employees}</TableCell>
                        <TableCell className="py-4 text-center text-sm font-semibold text-green-700">
                          {b.present}
                        </TableCell>
                        <TableCell className="py-4 text-center text-sm font-semibold text-red-700">
                          {b.absent}
                        </TableCell>
                        <TableCell className="py-4 text-center text-sm font-semibold text-orange-700">
                          {b.late}
                        </TableCell>
                        <TableCell className="py-4 text-center text-sm font-semibold text-blue-700">
                          {b.leave}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${getAttendanceColor(
                              attendancePct(b.present, b.late, b.absent),
                            )}`}
                          >
                            {attendancePct(b.present, b.late, b.absent)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-border bg-muted/40 font-semibold">
                      <TableCell className="py-4 text-sm font-bold">{branchTotal.branch}</TableCell>
                      <TableCell className="py-4 text-center text-sm font-bold">
                        {branchTotal.employees}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-bold text-green-700">
                        {branchTotal.present}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-bold text-red-700">
                        {branchTotal.absent}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-bold text-orange-700">
                        {branchTotal.late}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-bold text-blue-700">
                        {branchTotal.leave}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${getAttendanceColor(
                            attendancePct(
                              branchTotal.present,
                              branchTotal.late,
                              branchTotal.absent,
                            ),
                          )}`}
                        >
                          {attendancePct(branchTotal.present, branchTotal.late, branchTotal.absent)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by employee name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 flex-1"
            />
            <PeriodFilter value={period.key} onChange={setPeriod} excludeFuture />
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 font-semibold">Employee</TableHead>
                  <TableHead className="h-12 font-semibold">Designation</TableHead>
                  <TableHead className="h-12 font-semibold">Branch</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Present</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Absent</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Late</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Leave</TableHead>
                  <TableHead className="h-12 font-semibold text-right">Attendance %</TableHead>
                  <TableHead className="h-12 font-semibold text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.employeeId} className="hover:bg-muted/50 border-b">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={emp.employeeName} />
                          <span className="font-medium text-sm">{emp.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">{emp.designation}</TableCell>
                      <TableCell className="py-4 text-sm font-medium">{emp.branch}</TableCell>
                      <TableCell className="py-4 text-center text-sm font-semibold text-green-700">
                        {emp.totalPresent}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-semibold text-red-700">
                        {emp.totalAbsent}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-semibold text-orange-700">
                        {emp.totalLate}
                      </TableCell>
                      <TableCell className="py-4 text-center text-sm font-semibold text-blue-700">
                        {emp.totalLeave}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${getAttendanceColor(emp.attendancePercentage)}`}
                        >
                          {emp.attendancePercentage}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleDownloadOne(emp)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {employees.length} of {employees.length} employees
          </div>
        </CardContent>
      </Card>
    </>
  );
}
