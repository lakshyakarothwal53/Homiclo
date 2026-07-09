import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { useEmployeeProfile, useDeleteEmployee } from "@/hooks/use-employees";
import { toast } from "sonner";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
            <Button variant="outline" size="sm" className="gap-2">
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
            {showDeleteConfirm && (
              <div className="absolute right-0 top-full mt-2 bg-white border rounded shadow-lg p-3">
                <p className="text-sm mb-2">Delete employee?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => {
                      handleDelete();
                      setShowDeleteConfirm(false);
                    }}
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-500 hover:text-red-600"
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
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
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
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
