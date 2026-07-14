import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Thermometer, Camera, CheckCircle, RefreshCw, Map } from "lucide-react";
import { toast } from "sonner";
import { useLiveTracking } from "@/hooks/use-attendance";
import { useBranchScope } from "@/hooks/use-branch-scope";

export const Route = createFileRoute("/_app/attendance/live")({
  head: () => ({
    meta: [
      { title: "Live Tracking — HOMIQLO" },
      {
        name: "description",
        content: "Real-time presence with GPS and photo verification.",
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

function Page() {
  const [search, setSearch] = useState("");
  const { homeBranch } = useBranchScope();
  const { data: tracking = [], isLoading, refetch } = useLiveTracking(search, homeBranch);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const presentCount = tracking.filter((t) => t.currentStatus === "Present").length;

  // temperature is stored pre-formatted (e.g. "37.2°C"); fall back to
  // appending the unit only if a bare number ever comes through.
  const formatTemperature = (raw?: string) => {
    if (!raw) return "—";
    return /°c/i.test(raw) ? raw : `${raw}°C`;
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Live data updated");
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast.success(autoRefresh ? "Auto-refresh disabled" : "Auto-refresh enabled (every 30s)");
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Live Tracking"
        title="Live Tracking"
        description="Real-time presence with GPS and photo verification."
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              className="gap-2"
              onClick={handleToggleAutoRefresh}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Currently Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              GPS Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tracking.filter((t) => t.gpsVerified).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Photo Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {tracking.filter((t) => t.photoVerified).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-5 w-5 text-blue-600" />
            Live Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center border border-slate-300">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">Map View Coming Soon</p>
              <p className="text-sm text-slate-500">
                Real-time location tracking will be available here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border mt-6">
        <CardHeader>
          <CardTitle className="text-base">Live Presence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by employee name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 font-semibold">Employee</TableHead>
                  <TableHead className="h-12 font-semibold">Designation</TableHead>
                  <TableHead className="h-12 font-semibold">Check-In Time</TableHead>
                  <TableHead className="h-12 font-semibold">Location</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Temperature</TableHead>
                  <TableHead className="h-12 font-semibold text-center">Verifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : tracking.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No active presence data.
                    </TableCell>
                  </TableRow>
                ) : (
                  tracking.map((track) => (
                    <TableRow key={track.employeeId} className="hover:bg-muted/50 border-b">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={track.employeeName} />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{track.employeeName}</span>
                            <span
                              className={`text-xs font-medium ${
                                track.currentStatus === "Present"
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              ● {track.currentStatus}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">{track.designation}</TableCell>
                      <TableCell className="py-4 text-sm font-medium">
                        {track.checkInTime}
                      </TableCell>
                      <TableCell className="py-4 text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        {track.location}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sm font-medium">
                          <Thermometer className="h-4 w-4 text-orange-600" />
                          {formatTemperature(track.temperature)}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          {track.gpsVerified && (
                            <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium border border-green-200">
                              <CheckCircle className="h-3 w-3" />
                              GPS
                            </div>
                          )}
                          {track.photoVerified && (
                            <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium border border-purple-200">
                              <Camera className="h-3 w-3" />
                              Photo
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {tracking.length} active employees
            {autoRefresh && " (auto-refreshing every 30s)"}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
