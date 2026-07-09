import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEmployeeAttendance } from "@/hooks/use-attendance";

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

function Page() {
  const [search, setSearch] = useState("");
  const { data: employees = [], isLoading, refetch } = useEmployeeAttendance(search);

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

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Employee History"
        title="Employee History"
        description="Per-employee attendance timeline."
        actions={
          <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/50 border-b">
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
                          {emp.attendancePercentage}%
                        </span>
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
