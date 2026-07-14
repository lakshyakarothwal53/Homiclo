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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useEmployeeActivity } from "@/hooks/use-employees";

export const Route = createFileRoute("/_app/employees/activity")({
  head: () => ({
    meta: [
      { title: "Activity Tracking — HOMIQLO" },
      { name: "description", content: "What each employee is doing right now." },
    ],
  }),
  component: ActivityTrackingPage,
});

const ITEMS_PER_PAGE = 10;

function ActivityTrackingPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { homeBranch } = useBranchScope();
  const { data = [], isLoading } = useEmployeeActivity(search, homeBranch);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const activitySummary = {
    "Cash In": data.filter((a) => a.activity === "Cash In").length,
    "Stock Verification": data.filter((a) => a.activity === "Stock Verification").length,
    "Inventory Adjustment": data.filter((a) => a.activity === "Inventory Adjustment").length,
    "Sales Transaction": data.filter((a) => a.activity === "Sales Transaction").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title="Activity Tracking"
        description="What each employee is doing right now."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {Object.entries(activitySummary).map(([activity, count]) => (
          <Card key={activity} className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{activity}</p>
              <p className="text-2xl font-bold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="mb-6">
            <Input
              placeholder="Search by name or activity..."
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
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading activity data...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No activity records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((activity) => (
                    <TableRow key={activity.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{activity.employeeName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.branch}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{activity.activity}</TableCell>
                      <TableCell className="text-sm">{activity.timestamp}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.details}
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
