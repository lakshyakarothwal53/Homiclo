import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Plus } from "lucide-react";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useEmployees } from "@/hooks/use-employees";
import { useShiftConfigs } from "@/hooks/use-attendance";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/employees/")({
  head: () => ({
    meta: [
      { title: "Employee List — HOMIQLO" },
      { name: "description", content: "All employees across HOMIQLO branches." },
    ],
  }),
  component: EmployeeListPage,
});

const ITEMS_PER_PAGE = 10;

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

function EmployeeListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { homeBranch } = useBranchScope();
  const { data = [], isLoading } = useEmployees(search, homeBranch);
  // Shift names resolved client-side from one lookup, rather than a join per
  // employee row.
  const { data: shifts = [] } = useShiftConfigs();
  const shiftNameById = new Map(shifts.map((s) => [s.id, s.shiftName]));

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "Role", "Branch", "Shift", "Join Date", "Status", "Salary"],
      ...data.map((emp) => [
        emp.name,
        emp.email,
        emp.phone,
        emp.role,
        emp.branch,
        (emp.shiftId && shiftNameById.get(emp.shiftId)) || "Not assigned",
        emp.joinDate,
        emp.status,
        emp.salary,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title="Employee List"
        description="All employees across HOMIQLO branches."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => router.navigate({ to: "/employees/add" })}
            >
              <Plus className="h-4 w-4" /> New
            </Button>
          </>
        }
      />

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="mb-6">
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Loading employees...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((employee) => (
                    <TableRow
                      key={employee.id}
                      className="border-border cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.navigate({ to: `/employees/profile?id=${employee.id}` })
                      }
                    >
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {employee.email}
                      </TableCell>
                      <TableCell className="text-sm">{employee.phone}</TableCell>
                      <TableCell className="text-sm">{employee.role}</TableCell>
                      <TableCell className="text-sm">{employee.branch}</TableCell>
                      <TableCell className="text-sm">
                        {employee.shiftId && shiftNameById.get(employee.shiftId) ? (
                          shiftNameById.get(employee.shiftId)
                        ) : (
                          <span className="text-destructive">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{employee.joinDate}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.status)}>{employee.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{employee.salary}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, data.length)} of{" "}
                {data.length} employees
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={currentPage === page ? "bg-brand text-brand-foreground" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
