import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useEmployeeLogins } from "@/hooks/use-employees";

export const Route = createFileRoute("/_app/employees/login-monitoring")({
  head: () => ({
    meta: [
      { title: "Login Monitoring — HOMIQLO" },
      { name: "description", content: "Active sessions and login history." },
    ],
  }),
  component: LoginMonitoringPage,
});

const ITEMS_PER_PAGE = 10;

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "bg-[color:var(--success)] text-white";
    case "idle":
      return "bg-[color:var(--warning)] text-white";
    case "offline":
      return "bg-gray-300 text-gray-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "online":
      return "bg-[color:var(--success)]";
    case "idle":
      return "bg-[color:var(--warning)]";
    case "offline":
      return "bg-gray-400";
    default:
      return "bg-gray-300";
  }
}

function LoginMonitoringPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { homeBranch } = useBranchScope();
  const { data = [], isLoading } = useEmployeeLogins(search, homeBranch);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const onlineCount = data.filter((emp) => emp.status === "online").length;
  const idleCount = data.filter((emp) => emp.status === "idle").length;
  const offlineCount = data.filter((emp) => emp.status === "offline").length;

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title="Login Monitoring"
        description="Active sessions and login history."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getStatusDot("online")}`} />
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold">{onlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getStatusDot("idle")}`} />
              <div>
                <p className="text-sm text-muted-foreground">Idle</p>
                <p className="text-2xl font-bold">{idleCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getStatusDot("offline")}`} />
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold">{offlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="mb-6">
            <Input
              placeholder="Search by name or branch..."
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
                  <TableHead>Role · Branch</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading login data...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No login records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((login) => (
                    <TableRow key={login.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{login.employeeName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {login.employeeRole}
                      </TableCell>
                      <TableCell className="text-sm">{login.loginTime}</TableCell>
                      <TableCell className="text-sm">{login.logoutTime || "-"}</TableCell>
                      <TableCell className="text-sm">{login.duration || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(login.status)}>
                          {login.status.charAt(0).toUpperCase() + login.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {login.lastSeen}
                      </TableCell>
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
                {data.length} records
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
