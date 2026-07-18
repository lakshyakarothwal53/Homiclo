import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarClock, Download, UserX, RefreshCw, Plus, X, Check, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  useAbsentRecords,
  useCreateAbsentRecord,
  useDecideLeaveRequest,
  type LeaveDecision,
} from "@/hooks/use-attendance";
import { useAuth } from "@/components/auth/AuthProvider";
import { canApproveLeave } from "@/lib/roles";
import { useBranchScope, useSelfScope } from "@/hooks/use-branch-scope";
import { useEmployees } from "@/hooks/use-employees";
import { usePagination } from "@/hooks/use-pagination";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { matchesDate, parseRowDate, todayIso } from "@/lib/report-data";

export const Route = createFileRoute("/_app/attendance/absent")({
  head: () => ({
    meta: [
      { title: "Absent Report — HOMIQLO" },
      {
        name: "description",
        content: "Employees absent without prior leave.",
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ employee: "", date: "", type: "", reason: "" });
  const { homeBranch } = useBranchScope();
  const { selfOnly, employeeId } = useSelfScope();
  const { role } = useAuth();
  const {
    data: allAbsentRecords = [],
    isLoading,
    refetch,
  } = useAbsentRecords(search, homeBranch, employeeId);
  const { data: employees = [] } = useEmployees(undefined, homeBranch);
  const createAbsent = useCreateAbsentRecord();
  const decideLeave = useDecideLeaveRequest();
  const isApprover = role ? canApproveLeave(role) : false;

  const handleDecide = (id: string, employeeName: string, decision: LeaveDecision) => {
    decideLeave.mutate(
      { id, decision },
      {
        onSuccess: () =>
          toast.success(`Leave request for ${employeeName} ${decision.toLowerCase()}.`),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not update the leave request."),
      },
    );
  };

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allAbsentRecords.forEach((absent) => {
      const d = parseRowDate(absent.date);
      if (!d) return;
      const key = monthKey(d);
      if (!seen.has(key)) seen.set(key, d.toLocaleDateString("en-US", MONTH_KEY_FORMAT));
    });
    return [...seen.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [allAbsentRecords]);

  const absentRecords = useMemo(() => {
    return allAbsentRecords.filter((absent) => {
      if (statusFilter !== "all" && absent.status !== statusFilter) return false;
      if (!matchesDate(date, absent.date)) return false;
      if (month === "all") return true;
      const d = parseRowDate(absent.date);
      return d ? monthKey(d) === month : false;
    });
  }, [allAbsentRecords, date, month, statusFilter]);

  const { page, setPage, totalPages, pageItems } = usePagination(absentRecords);

  // Jump straight to the approval queue: leave requests are usually dated for
  // a future day, so the default "today" date filter hides them.
  const showPendingQueue = () => {
    setStatusFilter("Pending");
    setDate("");
    setMonth("all");
    setPage(1);
  };

  // Counted across every record in scope, not the date-filtered view — a
  // request awaiting approval still needs attention even when the table is
  // filtered to a different day.
  const pendingCount = useMemo(
    () => allAbsentRecords.filter((r) => r.status === "Pending").length,
    [allAbsentRecords],
  );

  const getLeaveTypeColor = (type?: string) => {
    switch (type) {
      case "Sick":
        return "text-red-600 bg-red-50";
      case "Personal":
        return "text-blue-600 bg-blue-50";
      case "Casual":
        return "text-yellow-600 bg-yellow-50";
      case "Paid":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Approved":
        return "text-green-700 bg-green-100";
      case "Pending":
        return "text-amber-700 bg-amber-100";
      case "Declined":
        return "text-gray-700 bg-gray-200";
      default:
        return "text-red-700 bg-red-100";
    }
  };

  const handleExport = () => {
    if (absentRecords.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Employee",
      "Employee ID",
      "Designation",
      "Leave Type",
      "Reason",
      "Branch",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...absentRecords.map((absent) =>
        [
          absent.date,
          absent.employeeName,
          absent.id,
          absent.designation,
          absent.leaveType || "",
          absent.reason || "",
          absent.branch,
          absent.status || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `absent-records-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Absent records exported successfully");
  };

  const handleAddAbsent = () => {
    if (!formData.employee || !formData.date || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }
    const emp = employees.find((e) => e.id === formData.employee);
    if (!emp) {
      toast.error("Select a valid employee.");
      return;
    }
    const dateLabel = new Date(formData.date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    createAbsent.mutate(
      {
        date: dateLabel,
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.role,
        branch: emp.branch,
        leaveType: formData.type,
        reason: formData.reason,
      },
      {
        onSuccess: () => {
          toast.success(`Absent record added for ${emp.name}.`);
          setOpenDialog(false);
          setFormData({ employee: "", date: "", type: "", reason: "" });
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not add absent record."),
      },
    );
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Data refreshed");
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Absent Report"
        title="Absent Report"
        description="Employees absent without prior leave."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            {/* Recording an absence against an arbitrary colleague is a
                supervisory action — employees use "Apply for Leave" on their
                own check-in page instead. */}
            {!selfOnly && (
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Absent</DialogTitle>
                    <DialogDescription>Add a new absent record for an employee.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Employee *</Label>
                      <Select
                        value={formData.employee}
                        onValueChange={(v) => setFormData({ ...formData, employee: v })}
                      >
                        <SelectTrigger className="mt-1 h-10">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} · {e.branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Date *</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="mt-1 h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Leave Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => setFormData({ ...formData, type: v })}
                      >
                        <SelectTrigger className="mt-1 h-10">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sick">Sick Leave</SelectItem>
                          <SelectItem value="Personal">Personal Leave</SelectItem>
                          <SelectItem value="Casual">Casual Leave</SelectItem>
                          <SelectItem value="Paid">Paid Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Reason</Label>
                      <Input
                        placeholder="Optional reason for absence"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="mt-1 h-10"
                      />
                    </div>
                    <Button
                      onClick={handleAddAbsent}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      Save Absent Record
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentRecords.length}</div>
          </CardContent>
        </Card>
        <Card
          className={`border-border ${pendingCount > 0 ? "cursor-pointer transition hover:border-amber-400 hover:bg-amber-50/50" : ""}`}
          onClick={pendingCount > 0 ? showPendingQueue : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount === 0
                ? "Nothing awaiting approval"
                : isApprover
                  ? "Click to review and approve"
                  : "Awaiting approval"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sick Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {absentRecords.filter((r) => r.leaveType === "Sick").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserX className="h-5 w-5 text-red-600" />
            Absent Records
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full sm:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isApprover && pendingCount > 0 && statusFilter !== "Pending" && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                <strong>{pendingCount}</strong> leave{" "}
                {pendingCount === 1 ? "request is" : "requests are"} waiting for your approval.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 bg-white hover:bg-amber-100"
                onClick={showPendingQueue}
              >
                Review now
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 font-semibold">Date</TableHead>
                  <TableHead className="h-12 font-semibold">Employee</TableHead>
                  <TableHead className="h-12 font-semibold">Designation</TableHead>
                  <TableHead className="h-12 font-semibold">Leave Type</TableHead>
                  <TableHead className="h-12 font-semibold">Reason</TableHead>
                  <TableHead className="h-12 font-semibold">Branch</TableHead>
                  <TableHead className="h-12 font-semibold">Status</TableHead>
                  {isApprover && (
                    <TableHead className="h-12 font-semibold text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isApprover ? 8 : 7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : absentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isApprover ? 8 : 7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No absent records match these filters.
                      {date && (
                        <>
                          {" "}
                          Showing <strong>{date}</strong> only —{" "}
                          <button
                            className="underline hover:text-foreground"
                            onClick={() => setDate("")}
                          >
                            clear the date filter
                          </button>{" "}
                          to see all records.
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((absent) => (
                    <TableRow key={absent.id} className="hover:bg-muted/50 border-b">
                      <TableCell className="py-4 text-sm font-medium">{absent.date}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={absent.employeeName} />
                          <span className="font-medium text-sm">{absent.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">{absent.designation}</TableCell>
                      <TableCell className="py-4">
                        {absent.leaveType && (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(absent.leaveType)}`}
                          >
                            {absent.leaveType}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {absent.reason || "—"}
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium">{absent.branch}</TableCell>
                      <TableCell className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(absent.status)}`}
                        >
                          {absent.status}
                        </span>
                      </TableCell>
                      {isApprover && (
                        <TableCell className="py-4 text-right">
                          {absent.status === "Pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="gap-1 bg-green-600 text-white hover:bg-green-700"
                                disabled={decideLeave.isPending}
                                onClick={() =>
                                  handleDecide(absent.id, absent.employeeName, "Approved")
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive hover:text-destructive"
                                disabled={decideLeave.isPending}
                                onClick={() =>
                                  handleDecide(absent.id, absent.employeeName, "Declined")
                                }
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <EntriesFooter
            total={absentRecords.length}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </>
  );
}
