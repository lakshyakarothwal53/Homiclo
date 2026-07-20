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
import {
  useAttendanceDashboard,
  useLateArrivals,
  useAbsentRecords,
  useAttendanceTrend,
} from "@/hooks/use-attendance";
import { useBranchScope } from "@/hooks/use-branch-scope";

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
  const { homeBranch } = useBranchScope();
  const {
    data: dashboard,
    refetch: refetchDashboard,
    isRefetching,
  } = useAttendanceDashboard(homeBranch);
  const { data: lateArrivals = [], refetch: refetchLate } = useLateArrivals(undefined, homeBranch);
  const { data: absentRecords = [], refetch: refetchAbsent } = useAbsentRecords(
    undefined,
    homeBranch,
  );
  const { data: attendanceTrendData = [] } = useAttendanceTrend(homeBranch);

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchLate(), refetchAbsent()]);
    toast.success("Data refreshed successfully");
  };

  const departmentTotals = dashboard?.departmentAttendance ?? [];
  const totalHeadcount = departmentTotals.reduce((sum, dept) => sum + dept.count, 0);
  const departmentData = departmentTotals.map((dept) => ({
    name: `${dept.department} (${dept.count})`,
    value: totalHeadcount > 0 ? Math.round((dept.count / totalHeadcount) * 100) : 0,
  }));

  const COLORS = [
    "#FE0000",
    "#2563EB",
    "#22C55E",
    "#F59E0B",
    "#8B5CF6",
    "#0EA5E9",
    "#6B7280",
    "#EC4899",
  ];

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
          value={dashboard ? String(dashboard.stats.presentToday) : "—"}
          icon={Users}
          trend="up"
        />
        <StatCard
          label="Absent"
          value={dashboard ? String(dashboard.stats.absentToday) : "—"}
          icon={AlertCircle}
        />
        <StatCard
          label="Late Arrivals"
          value={dashboard ? String(dashboard.stats.lateToday) : "—"}
          icon={Clock}
        />
        <StatCard
          label="Avg Attendance"
          value={dashboard?.stats.averageAttendance ?? "—"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Attendance Trend (Last 7 Days)</CardTitle>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Department Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">By headcount share</p>
          </CardHeader>
          <CardContent className="h-72">
            {departmentData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No roster data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
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
