import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Clock, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { useAttendanceDashboard, useLateArrivals, useAbsentRecords } from "@/hooks/use-attendance";

export const Route = createFileRoute("/_app/attendance/")({
  head: () => ({
    meta: [
      { title: "Attendance Overview — HOMIQLO" },
      {
        name: "description",
        content: "Today's check-ins, late arrivals and absences.",
      },
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
  const { data: dashboard, refetch: refetchDashboard, isRefetching } = useAttendanceDashboard();
  const { data: lateArrivals = [], refetch: refetchLate } = useLateArrivals();
  const { data: absentRecords = [], refetch: refetchAbsent } = useAbsentRecords();

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchLate(), refetchAbsent()]);
    toast.success("Data refreshed successfully");
  };

  const attendanceTrendData = [
    { day: "Mon", present: 48, absent: 8, late: 4 },
    { day: "Tue", present: 50, absent: 6, late: 4 },
    { day: "Wed", present: 47, absent: 9, late: 4 },
    { day: "Thu", present: 51, absent: 5, late: 4 },
    { day: "Fri", present: 49, absent: 7, late: 4 },
    { day: "Sat", present: 45, absent: 11, late: 4 },
  ];

  const departmentData = dashboard?.departmentAttendance?.map((dept) => ({
    name: dept.department,
    value: parseInt(dept.percentage),
  })) || [
    { name: "Sales", value: 92 },
    { name: "Operations", value: 88 },
    { name: "HR", value: 95 },
    { name: "IT", value: 91 },
  ];

  const COLORS = ["#22c55e", "#f97316", "#ef4444", "#3b82f6"];

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Dashboard"
        title="Attendance Overview"
        description="Today's check-ins, late arrivals and absences."
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link to="/attendance/logs">View Logs</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Present Today"
          value={dashboard?.stats.presentToday ?? "—"}
          icon={Users}
          trend="up"
        />
        <StatCard label="Absent" value={dashboard?.stats.absentToday ?? "—"} icon={AlertCircle} />
        <StatCard label="Late Arrivals" value={dashboard?.stats.lateToday ?? "—"} icon={Clock} />
        <StatCard
          label="Avg Attendance"
          value={dashboard?.stats.averageAttendance ?? "—"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">30-Day Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#22c55e" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                <Bar dataKey="late" fill="#f97316" name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Department Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Late Arrivals</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-brand hover:text-brand">
                <Link to="/attendance/late">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10">Employee</TableHead>
                    <TableHead className="h-10">Check-In</TableHead>
                    <TableHead className="h-10 text-right">Minutes Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lateArrivals.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-4 text-center text-muted-foreground text-sm"
                      >
                        No late arrivals today
                      </TableCell>
                    </TableRow>
                  ) : (
                    lateArrivals.slice(0, 5).map((late) => (
                      <TableRow key={late.id} className="hover:bg-muted/50">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <EmployeeAvatar name={late.employeeName} />
                            <span className="font-medium">{late.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {late.checkInTime}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                            {late.latenessMinutes} min
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Absent Records</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-brand hover:text-brand">
                <Link to="/attendance/absent">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10">Employee</TableHead>
                    <TableHead className="h-10">Leave Type</TableHead>
                    <TableHead className="h-10">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-4 text-center text-muted-foreground text-sm"
                      >
                        No absent records
                      </TableCell>
                    </TableRow>
                  ) : (
                    absentRecords.slice(0, 5).map((absent) => (
                      <TableRow key={absent.id} className="hover:bg-muted/50">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <EmployeeAvatar name={absent.employeeName} />
                            <span className="font-medium">{absent.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm">{absent.leaveType || "—"}</TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {absent.date}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
