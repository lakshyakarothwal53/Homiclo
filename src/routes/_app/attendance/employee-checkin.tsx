import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Loader2,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import {
  useEmployeeCheckins,
  useEmployeeMonthlySummary,
  useOfficeLocations,
  useSubmitEmployeeCheckin,
  validateGeofence,
  calculateGeofenceDistance,
} from "@/hooks/use-attendance";

export const Route = createFileRoute("/_app/attendance/employee-checkin")({
  head: () => ({
    meta: [
      { title: "My Attendance — HOMIQLO" },
      {
        name: "description",
        content: "Mark your attendance with geofenced location verification.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [isLocating, setIsLocating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const checkDate = today.toISOString().split("T")[0];

  const { data: officeLocations = [] } = useOfficeLocations();
  const { data: employeeCheckins = [] } = useEmployeeCheckins(user?.id || "", checkDate);
  const { data: monthlySummary } = useEmployeeMonthlySummary(user?.id || "");
  const submitCheckin = useSubmitEmployeeCheckin();

  // Set default office location to user's branch
  useEffect(() => {
    if (officeLocations.length > 0 && !selectedOffice) {
      const userOffice = officeLocations.find(
        (o) => o.branch.toLowerCase() === user?.branch.toLowerCase(),
      );
      setSelectedOffice(userOffice?.id || officeLocations[0].id);
    }
  }, [officeLocations, selectedOffice, user?.branch]);

  const getLocation = async () => {
    setIsLocating(true);
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLocating(false);
          toast.success(
            `Location captured: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          );
        },
        (error) => {
          setIsLocating(false);
          console.error("Geolocation error:", error);
          toast.error(
            error.message || "Unable to get your location. Please enable location services.",
          );
        },
      );
    } catch (error) {
      setIsLocating(false);
      toast.error(error instanceof Error ? error.message : "Error getting location");
    }
  };

  const handleCheckIn = async (checkType: "check-in" | "check-out") => {
    if (!currentLocation) {
      toast.error("Please capture your location first");
      return;
    }

    if (!selectedOffice) {
      toast.error("Please select an office location");
      return;
    }

    const office = officeLocations.find((o) => o.id === selectedOffice);
    if (!office) {
      toast.error("Office location not found");
      return;
    }

    // Validate geofence
    const geofenceCheck = validateGeofence({
      employeeId: user?.id || "",
      employeeName: user?.name || "",
      branch: user?.branch || "",
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      checkType,
      officeLocation: office,
    });

    if (!geofenceCheck.isWithinGeofence) {
      toast.error(geofenceCheck.errorMessage || "You are outside the office geofence");
      return;
    }

    // Get current time
    const now = new Date();
    const checkTime = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    try {
      await submitCheckin.mutateAsync({
        employeeId: user?.id || "",
        employeeName: user?.name || "",
        branch: user?.branch || "",
        checkDate,
        checkType,
        checkTime,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        geofenceVerified: geofenceCheck.isWithinGeofence,
        distanceFromOfficeM: geofenceCheck.distanceM,
        status: "success",
      });

      toast.success(
        `${checkType === "check-in" ? "Check-in" : "Check-out"} successful! Distance: ${geofenceCheck.distanceM.toFixed(1)}m`,
      );

      // Reset location
      setCurrentLocation(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit attendance");
    }
  };

  // Get today's check-ins
  const todayCheckins = employeeCheckins.filter((c) => c.status === "success");
  const hasCheckedIn = todayCheckins.some((c) => c.checkType === "check-in");
  const hasCheckedOut = todayCheckins.some((c) => c.checkType === "check-out");

  const selectedOfficeData = officeLocations.find((o) => o.id === selectedOffice);
  const distanceText =
    currentLocation && selectedOfficeData
      ? `${calculateGeofenceDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          Number(selectedOfficeData.latitude),
          Number(selectedOfficeData.longitude),
        ).toFixed(1)}m away`
      : "Location not captured";

  return (
    <>
      <PageHeader
        eyebrow="Attendance › My Check-in"
        title="Mark Your Attendance"
        description="Use GPS to verify your location and mark attendance within the office geofence."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Check-in Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                GPS Location Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Geofence Requirement:</strong> You must be within{" "}
                  {selectedOfficeData?.radiusMeters || 50} meters of the office to mark attendance.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Office Location
                  </label>
                  <select
                    value={selectedOffice || ""}
                    onChange={(e) => setSelectedOffice(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    {officeLocations.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name} ({office.address || "No address"})
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={getLocation}
                  disabled={isLocating}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Capturing Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      Capture My Location
                    </>
                  )}
                </Button>

                {currentLocation && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-900 dark:text-green-100">
                      <strong>Coordinates:</strong>{" "}
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-green-900 dark:text-green-100 mt-1">
                      <strong>Distance from office:</strong> {distanceText}
                    </p>
                  </div>
                )}
              </div>

              {currentLocation && selectedOfficeData && (
                <>
                  {validateGeofence({
                    employeeId: user?.id || "",
                    employeeName: user?.name || "",
                    branch: user?.branch || "",
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    checkType: "check-in",
                    officeLocation: selectedOfficeData,
                  }).isWithinGeofence ? (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-100">
                        ✓ You are within the office geofence. You can mark attendance.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 dark:text-red-100">
                        {
                          validateGeofence({
                            employeeId: user?.id || "",
                            employeeName: user?.name || "",
                            branch: user?.branch || "",
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                            checkType: "check-in",
                            officeLocation: selectedOfficeData,
                          }).errorMessage
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  onClick={() => handleCheckIn("check-in")}
                  disabled={submitCheckin.isPending || !currentLocation || hasCheckedIn}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitCheckin.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {hasCheckedIn ? "Checked In" : "Check In"}
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleCheckIn("check-out")}
                  disabled={submitCheckin.isPending || !currentLocation || !hasCheckedIn || hasCheckedOut}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {submitCheckin.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      {hasCheckedOut ? "Checked Out" : "Check Out"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Check-ins */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Today's Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-10">Time</TableHead>
                      <TableHead className="h-10">Type</TableHead>
                      <TableHead className="h-10">Status</TableHead>
                      <TableHead className="h-10 text-right">Distance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayCheckins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                          No check-ins yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      todayCheckins.map((checkin) => (
                        <TableRow key={checkin.id} className="hover:bg-muted/50">
                          <TableCell className="py-3 font-medium">{checkin.checkTime}</TableCell>
                          <TableCell className="py-3 text-sm capitalize">
                            {checkin.checkType}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              {checkin.geofenceVerified ? "Verified" : "Outside Geofence"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm">
                            {checkin.distanceFromOfficeM?.toFixed(1)}m
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary Sidebar */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Monthly Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthlySummary ? (
                <>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
                    <p className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                      Attendance Rate
                    </p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      {monthlySummary.attendancePercentage}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                        Working Days
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                        {monthlySummary.workingDays}
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-600 dark:text-green-300 font-medium">
                        Present
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                        {monthlySummary.presentDays}
                      </p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-600 dark:text-red-300 font-medium">Absent</p>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                        {monthlySummary.absentDays}
                      </p>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-600 dark:text-orange-300 font-medium">
                        Late
                      </p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                        {monthlySummary.lateDays}
                      </p>
                    </div>
                  </div>

                  {monthlySummary.leaveDays > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">
                        Leave Days
                      </p>
                      <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                        {monthlySummary.leaveDays}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No attendance data available for this month</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-100">
              <strong>Note:</strong> Monthly summary updates automatically as you mark attendance.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  );
}
