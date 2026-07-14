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
import {
  CalendarClock,
  Download,
  FileDown,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDailyLogs } from "@/hooks/use-attendance";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { buildTablePdf, downloadPdf } from "@/lib/pdf-utils";
import { matchesDate, parseRowDate } from "@/lib/report-data";

export const Route = createFileRoute("/_app/attendance/logs")({
  head: () => ({
    meta: [
      { title: "Daily Logs — HOMIQLO" },
      {
        name: "description",
        content: "Every check-in and check-out across branches.",
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
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("all");
  const { homeBranch } = useBranchScope();
  const { data: allLogs = [], isLoading, refetch } = useDailyLogs(search, homeBranch);

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allLogs.forEach((log) => {
      const d = parseRowDate(log.date);
      if (!d) return;
      const key = monthKey(d);
      if (!seen.has(key)) seen.set(key, d.toLocaleDateString("en-US", MONTH_KEY_FORMAT));
    });
    return [...seen.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [allLogs]);

  const logs = useMemo(() => {
    return allLogs.filter((log) => {
      if (!matchesDate(date, log.date)) return false;
      if (month === "all") return true;
      const d = parseRowDate(log.date);
      return d ? monthKey(d) === month : false;
    });
  }, [allLogs, date, month]);

  const { page, setPage, totalPages, pageItems } = usePagination(logs);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "text-green-600 bg-green-50";
      case "Late":
        return "text-orange-600 bg-orange-50";
      case "Absent":
        return "text-red-600 bg-red-50";
      case "Leave":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Late":
        return <Clock className="h-4 w-4 text-orange-600" />;
      case "Absent":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Leave":
        return <CalendarClock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Employee",
      "Employee ID",
      "Date",
      "Check-In",
      "Check-Out",
      "Status",
      "Branch",
      "Location",
    ];
    const csvContent = [
      headers.join(","),
      ...logs.map((log) =>
        [
          log.employeeName,
          log.id,
          log.date,
          log.checkInTime || "",
          log.checkOutTime || "",
          log.status,
          log.branch,
          log.location || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const handleDownloadPdf = () => {
    if (logs.length === 0) {
      toast.error("No data to download");
      return;
    }
    const monthLabel =
      month === "all" ? "All months" : monthOptions.find(([k]) => k === month)?.[1];
    const doc = buildTablePdf({
      title: "Attendance Daily Logs",
      subtitle: monthLabel,
      columns: ["Employee", "ID", "Date", "Check-In", "Check-Out", "Status", "Branch", "Location"],
      rows: logs.map((log) => [
        log.employeeName,
        log.id,
        log.date,
        log.checkInTime || "—",
        log.checkOutTime || "—",
        log.status,
        log.branch,
        log.location || "—",
      ]),
    });
    downloadPdf(doc, `attendance-daily-logs-${new Date().toISOString().split("T")[0]}`);
    toast.success("Daily logs downloaded.");
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Data refreshed");
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Daily Logs"
        title="Daily Logs"
        description="Every check-in and check-out across branches."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleDownloadPdf}>
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        }
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Log Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by employee name or ID..."
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
                  <TableHead className="h-12 font-semibold">Employee</TableHead>
                  <TableHead className="h-12 font-semibold">Date</TableHead>
                  <TableHead className="h-12 font-semibold">Check-In</TableHead>
                  <TableHead className="h-12 font-semibold">Check-Out</TableHead>
                  <TableHead className="h-12 font-semibold">Status</TableHead>
                  <TableHead className="h-12 font-semibold">Branch</TableHead>
                  <TableHead className="h-12 font-semibold">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50 border-b">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={log.employeeName} />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.employeeName}</span>
                            <span className="text-xs text-muted-foreground">{log.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {log.date}
                      </TableCell>
                      <TableCell className="py-4 text-sm">{log.checkInTime || "—"}</TableCell>
                      <TableCell className="py-4 text-sm">{log.checkOutTime || "—"}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}
                          >
                            {log.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium">{log.branch}</TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {log.location || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <EntriesFooter
            total={logs.length}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
