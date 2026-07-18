import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarClock, Download, RefreshCw, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { useLateArrivals } from "@/hooks/use-attendance";
import { useBranchScope, useSelfScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { matchesDate, parseRowDate, todayIso } from "@/lib/report-data";

export const Route = createFileRoute("/_app/attendance/late")({
  head: () => ({
    meta: [
      { title: "Late Arrivals — HOMIQLO" },
      {
        name: "description",
        content: "Employees arriving past their shift start.",
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

const MONTH_KEY_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Page() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayIso());
  const [month, setMonth] = useState("all");
  const { homeBranch } = useBranchScope();
  const { employeeId } = useSelfScope();
  const {
    data: allLateArrivals = [],
    isLoading,
    refetch,
  } = useLateArrivals(search, homeBranch, employeeId);

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allLateArrivals.forEach((late) => {
      const d = parseRowDate(late.date);
      if (!d) return;
      const key = monthKey(d);
      if (!seen.has(key)) seen.set(key, d.toLocaleDateString("en-US", MONTH_KEY_FORMAT));
    });
    return [...seen.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [allLateArrivals]);

  const lateArrivals = useMemo(() => {
    return allLateArrivals.filter((late) => {
      if (!matchesDate(date, late.date)) return false;
      if (month === "all") return true;
      const d = parseRowDate(late.date);
      return d ? monthKey(d) === month : false;
    });
  }, [allLateArrivals, date, month]);

  const { page, setPage, totalPages, pageItems } = usePagination(lateArrivals);

  const getLatenessColor = (minutes: number) => {
    if (minutes <= 15) return "text-yellow-600 bg-yellow-50";
    if (minutes <= 45) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const totalLateCount = lateArrivals.length;
  const avgLateness =
    lateArrivals.length > 0
      ? Math.round(
          lateArrivals.reduce((sum, item) => sum + item.latenessMinutes, 0) / lateArrivals.length,
        )
      : 0;

  const handleExport = () => {
    if (lateArrivals.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Employee", "Employee ID", "Check-In", "Minutes Late", "Branch"];
    const csvContent = [
      headers.join(","),
      ...lateArrivals.map((late) =>
        [
          late.date,
          late.employeeName,
          late.id,
          late.checkInTime,
          late.latenessMinutes,
          late.branch,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `late-arrivals-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Late arrivals exported successfully");
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Data refreshed");
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Late Arrivals"
        title="Late Arrivals"
        description="Employees arriving past their shift start."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Late Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLateCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Lateness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLateness} min</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Late Arrival Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by employee name or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 sm:flex-1"
            />
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full sm:w-44"
              />
              {!!date && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Clear date filter"
                  onClick={() => setDate("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-10 w-full sm:w-52">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthOptions.map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 font-semibold">Date</TableHead>
                  <TableHead className="h-12 font-semibold">Employee</TableHead>
                  <TableHead className="h-12 font-semibold">Check-In Time</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Minutes Late</TableHead>
                  <TableHead className="h-12 font-semibold">Branch</TableHead>
                  <TableHead className="h-12 font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : lateArrivals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No late arrivals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((late) => (
                    <TableRow key={late.id} className="hover:bg-muted/50 border-b">
                      <TableCell className="py-4 text-sm font-medium">{late.date}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={late.employeeName} />
                          <span className="font-medium text-sm">{late.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">{late.checkInTime}</TableCell>
                      <TableCell className="py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${getLatenessColor(late.latenessMinutes)}`}
                        >
                          {late.latenessMinutes} min
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium">{late.branch}</TableCell>
                      <TableCell className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {late.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <EntriesFooter
            total={lateArrivals.length}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
