import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
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
import { MapPin } from "lucide-react";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useEmployeeLocations } from "@/hooks/use-employees";

export const Route = createFileRoute("/_app/employees/location")({
  head: () => ({
    meta: [
      { title: "Location Tracking — HOMIQLO" },
      { name: "description", content: "Live location for field staff." },
    ],
  }),
  component: LocationTrackingPage,
});

const ITEMS_PER_PAGE = 10;

function LocationTrackingPage() {
  const [currentPage, setCurrentPage] = useState(1);

  const { homeBranch } = useBranchScope();
  const { data = [], isLoading } = useEmployeeLocations(homeBranch);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title="Location Tracking"
        description="Live location for field staff."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Employees</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-sm font-medium">Just now</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Coverage</p>
            <p className="text-2xl font-bold">{data.length} branches</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading location data...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No location data available
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((location) => (
                    <TableRow key={location.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{location.employeeName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {location.branch}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-brand" />
                          {location.address}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm">{location.accuracy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {location.timestamp}
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
                {data.length} locations
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
