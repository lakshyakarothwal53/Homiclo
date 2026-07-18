import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { ArrowLeft, Download, Edit2, Trash2 } from "lucide-react";
import { useEmployeeProfile, useDeleteEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import { useBranches } from "@/hooks/use-inventory";
import { useShiftConfigs } from "@/hooks/use-attendance";
import { fetchEmployeeAttendanceSummary } from "@/lib/report-data";
import { buildTablePdf, downloadPdf } from "@/lib/pdf-utils";
import type { EmployeeRole, EmployeeStatus } from "@/types/employees";
import { toast } from "sonner";

const ROLES = ["Cashier", "Floor Manager", "Inventory", "Supervisor", "Admin", "HR", "Employee"];
const STATUSES = ["Active", "Inactive", "Suspended"];

function editFields(branches: string[], shifts: { value: string; label: string }[]): EntityField[] {
  return [
    { key: "name", label: "Name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone", required: true },
    { key: "role", label: "Role", type: "select", options: ROLES, required: true },
    { key: "branch", label: "Branch", type: "select", options: branches, required: true },
    // Stored value is the shift's id; the label shows its name and hours.
    { key: "shiftId", label: "Shift", type: "select", options: shifts, required: true },
    { key: "status", label: "Status", type: "select", options: STATUSES, required: true },
    { key: "salary", label: "Salary", required: true },
  ];
}

export const Route = createFileRoute("/_app/employees/profile")({
  head: () => ({
    meta: [
      { title: "Employee Profile — HOMIQLO" },
      { name: "description", content: "Personal details, role and attendance." },
    ],
  }),
  component: EmployeeProfilePage,
  validateSearch: (search: Record<string, unknown>) => ({
    id: search.id as string,
  }),
});

function getStatusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-[color:var(--success)] text-white";
    case "Inactive":
      return "bg-gray-200 text-gray-800";
    case "Suspended":
      return "bg-[color:var(--destructive)] text-white";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function EmployeeProfilePage() {
  const router = useRouter();
  const { id } = useSearch({ from: "/_app/employees/profile" });
  const { data: profile, isLoading } = useEmployeeProfile(id);
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();
  const { mutate: updateEmployee } = useUpdateEmployee();
  const { data: branches = [] } = useBranches();
  const { data: shifts = [] } = useShiftConfigs();
  const shiftOptions = shifts.map((s) => ({
    value: s.id,
    label: `${s.shiftName} (${s.startTime} - ${s.endTime})`,
  }));
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <>
        <PageHeader eyebrow="EMPLOYEES" title="Loading..." />
        <Card>
          <CardContent className="pt-6">Loading profile...</CardContent>
        </Card>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <PageHeader eyebrow="EMPLOYEES" title="Not Found" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Employee not found</p>
            <Button className="mt-4" onClick={() => router.navigate({ to: "/employees" })}>
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const handleDelete = () => {
    deleteEmployee(profile.id, {
      onSuccess: () => {
        toast.success("Employee deleted successfully");
        router.navigate({ to: "/employees" });
      },
      onError: (error) => {
        toast.error(`Failed to delete employee: ${error.message}`);
      },
    });
  };

  const handleEditSave = (values: EntityValues) => {
    updateEmployee(
      {
        id: profile.id,
        name: String(values.name),
        email: String(values.email),
        phone: String(values.phone),
        role: values.role as EmployeeRole,
        branch: String(values.branch),
        joinDate: profile.joinDate,
        status: values.status as EmployeeStatus,
        salary: String(values.salary),
        shiftId: values.shiftId ? String(values.shiftId) : undefined,
      },
      {
        onSuccess: () => toast.success("Employee updated successfully"),
        onError: (error) => toast.error(`Failed to update employee: ${error.message}`),
      },
    );
  };

  const handleDownloadAttendance = async () => {
    try {
      const data = await fetchEmployeeAttendanceSummary(profile.id);
      const rows =
        data.rows.length > 0
          ? data.rows
          : [["No check-in records found for this employee yet.", "", "", "", ""]];
      downloadPdf(
        buildTablePdf({
          title: `Attendance Summary — ${profile.name}`,
          subtitle: `${profile.role} · ${profile.branch}`,
          columns: data.columns,
          rows,
        }),
        `attendance-summary-${profile.name.toLowerCase().replace(/\s+/g, "-")}`,
      );
      toast.success("Attendance summary downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate attendance summary.");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title={profile.name}
        description={`${profile.role} · ${profile.branch}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.navigate({ to: "/employees" })}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{profile.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the employee. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <EntityFormDialog
        mode="edit"
        title="Edit Employee"
        description="Update this employee's details."
        fields={editFields(branches, shiftOptions)}
        initial={profile}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEditSave}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{profile.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emergency Contact</p>
                <p className="font-medium">{profile.emergencyContact}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Employee Status</p>
              <Badge className={getStatusColor(profile.status)}>{profile.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{profile.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-medium">{profile.branch}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shift</p>
              <p className={profile.shiftName ? "font-medium" : "font-medium text-destructive"}>
                {profile.shiftName ?? "Not assigned"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Join Date</p>
              <p className="font-medium">{profile.joinDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salary</p>
              <p className="font-medium">{profile.salary}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Attendance Summary</CardTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadAttendance}>
            <Download className="h-4 w-4" /> Download
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Days Present</p>
              <p className="text-2xl font-bold">{profile.daysPresent}</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Days Late</p>
              <p className="text-2xl font-bold">{profile.daysLate}</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Days Absent</p>
              <p className="text-2xl font-bold">{profile.daysAbsent}</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <p className="text-2xl font-bold text-[color:var(--success)]">
                {profile.attendanceRate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
