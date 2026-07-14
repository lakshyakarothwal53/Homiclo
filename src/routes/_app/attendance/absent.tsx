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
import { CalendarClock, Download, UserX, RefreshCw, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAbsentRecords, useCreateAbsentRecord } from "@/hooks/use-attendance";
import { useBranchScope } from "@/hooks/use-branch-scope";
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
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ employee: "", date: "", type: "", reason: "" });
  const { homeBranch } = useBranchScope();
  const { data: allAbsentRecords = [], isLoading, refetch } = useAbsentRecords(search, homeBranch);
  const { data: employees = [] } = useEmployees(undefined, homeBranch);
  const createAbsent = useCreateAbsentRecord();

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
      if (!matchesDate(date, absent.date)) return false;
      if (month === "all") return true;
      const d = parseRowDate(absent.date);
      return d ? monthKey(d) === month : false;
    });
  }, [allAbsentRecords, date, month]);

  const { page, setPage, totalPages, pageItems } = usePagination(absentRecords);

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
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : absentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No absent records found.
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
