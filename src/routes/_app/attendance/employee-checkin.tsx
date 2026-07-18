import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CalendarPlus,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAbsentRecords,
  useApplyLeaveRequest,
  useEmployeeCheckins,
  useEmployeeMonthlySummary,
  useOfficeLocations,
  useSubmitEmployeeCheckin,
  uploadCheckinPhoto,
  validateGeofence,
  calculateGeofenceDistance,
} from "@/hooks/use-attendance";
import { useEmployeeShift } from "@/hooks/use-employees";
import { SelfieCapture, type SelfieResult } from "@/components/attendance/SelfieCapture";

// "09:31 AM" or 24-hour "21:00" → minutes since midnight, or null if unparseable.
function parseTimeToMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// Whether `nowMinutes` falls inside the shift's [start - grace, end] window,
// wrapping past midnight for overnight shifts (e.g. 09:00 PM - 06:00 AM).
function isWithinShiftWindow(
  shift: { startTime: string; endTime: string; gracePeriodMinutes: number },
  nowMinutes: number,
): boolean {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  if (start === null || end === null) return true;
  const windowStart = (start - shift.gracePeriodMinutes + 1440) % 1440;
  if (end <= windowStart) {
    return nowMinutes >= windowStart || nowMinutes <= end;
  }
  return nowMinutes >= windowStart && nowMinutes <= end;
}

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
  const [selfie, setSelfie] = useState<SelfieResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const checkDate = today.toISOString().split("T")[0];

  const { data: officeLocations = [] } = useOfficeLocations();
  const { data: employeeCheckins = [] } = useEmployeeCheckins(user?.id || "", checkDate);
  const { data: monthlySummary } = useEmployeeMonthlySummary(user?.id || "");
  const { data: assignedShift, isLoading: shiftLoading } = useEmployeeShift(user?.id);
  const submitCheckin = useSubmitEmployeeCheckin();

  // Live clock so the shift-window gate (and its message) updates on its own
  // while the page is left open, without requiring a manual refresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const withinShiftWindow = assignedShift ? isWithinShiftWindow(assignedShift, nowMinutes) : false;

  const applyLeave = useApplyLeaveRequest();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ date: checkDate, type: "", reason: "" });

  // This employee's own leave requests, so they can see whether a manager has
  // approved or declined what they submitted.
  const { data: branchAbsences = [] } = useAbsentRecords(undefined, user?.branch);
  const myLeaveRequests = branchAbsences
    .filter((r) => r.employeeId === user?.id && r.leaveType)
    .slice(0, 5);

  const handleApplyLeave = () => {
    if (!leaveForm.date || !leaveForm.type) {
      toast.error("Please select a date and leave type");
      return;
    }
    const dateLabel = new Date(leaveForm.date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    applyLeave.mutate(
      {
        date: dateLabel,
        employeeId: user?.id || "",
        employeeName: user?.name || "",
        designation: user?.role || "Employee",
        branch: user?.branch || "",
        leaveType: leaveForm.type,
        reason: leaveForm.reason,
      },
      {
        onSuccess: () => {
          toast.success("Leave request submitted for approval.");
          setLeaveOpen(false);
          setLeaveForm({ date: checkDate, type: "", reason: "" });
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not submit leave request."),
      },
    );
  };

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
    if (!assignedShift) {
      toast.error(
        "No shift assigned. Contact your admin to assign a shift before marking attendance.",
      );
      return;
    }

    if (!isWithinShiftWindow(assignedShift, new Date().getHours() * 60 + new Date().getMinutes())) {
      toast.error(
        `You can only mark attendance during your ${assignedShift.shiftName} window (${assignedShift.startTime} - ${assignedShift.endTime}).`,
      );
      return;
    }

    if (!currentLocation) {
      toast.error("Please capture your location first");
      return;
    }

    if (!selfie) {
      toast.error("Please capture your photo first");
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
      setIsUploading(true);
      // Upload the watermarked selfie first; if this fails we abort so no
      // check-in is recorded without its required proof-of-presence photo.
      const photoUrl = await uploadCheckinPhoto(selfie.blob, user?.id || "", checkType);

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
        photoUrl,
      });

      toast.success(
        `${checkType === "check-in" ? "Check-in" : "Check-out"} successful! Distance: ${geofenceCheck.distanceM.toFixed(1)}m`,
      );

      // Reset location + photo for the next mark.
      setCurrentLocation(null);
      setSelfie(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit attendance");
    } finally {
      setIsUploading(false);
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

  // Lines burned into the selfie so the photo itself carries the location,
  // office and timestamp (a "geotagged" attendance photo).
  const watermarkLines = [
    new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    currentLocation
      ? `Lat ${currentLocation.latitude.toFixed(5)}, Lng ${currentLocation.longitude.toFixed(5)}`
      : "Location not captured",
    selectedOfficeData
      ? `${selectedOfficeData.name}${selectedOfficeData.address ? ` · ${selectedOfficeData.address}` : ""}`
      : "",
    user?.name ? `${user.name}${user.branch ? ` · ${user.branch}` : ""}` : "",
  ].filter(Boolean);

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
                <Clock className="h-5 w-5 text-purple-600" />
                Your Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shiftLoading ? (
                <p className="text-sm text-muted-foreground">Loading your shift assignment…</p>
              ) : !assignedShift ? (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-100">
                    No shift assigned. Contact your admin to assign a shift before you can mark
                    attendance.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{assignedShift.shiftName}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignedShift.startTime} - {assignedShift.endTime} ·{" "}
                      {assignedShift.gracePeriodMinutes} min grace
                    </p>
                  </div>
                  {withinShiftWindow ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      Active now — you can mark attendance
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                      Outside shift window
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
                      <strong>Coordinates:</strong> {currentLocation.latitude.toFixed(6)},{" "}
                      {currentLocation.longitude.toFixed(6)}
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

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-600" />
                  <label className="text-sm font-medium text-muted-foreground">
                    Attendance Photo
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentLocation
                    ? "Take a live photo to mark attendance — your location and time are stamped onto it."
                    : "Capture your location first, then take a live photo to mark attendance."}
                </p>
                <SelfieCapture
                  watermark={watermarkLines}
                  onCapture={setSelfie}
                  disabled={!currentLocation}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  onClick={() => handleCheckIn("check-in")}
                  disabled={
                    submitCheckin.isPending ||
                    isUploading ||
                    !currentLocation ||
                    !selfie ||
                    hasCheckedIn ||
                    !assignedShift ||
                    !withinShiftWindow
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitCheckin.isPending || isUploading ? (
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
                  disabled={
                    submitCheckin.isPending ||
                    isUploading ||
                    !currentLocation ||
                    !selfie ||
                    !hasCheckedIn ||
                    hasCheckedOut ||
                    !assignedShift ||
                    !withinShiftWindow
                  }
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {submitCheckin.isPending || isUploading ? (
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
                      <TableHead className="h-10">Photo</TableHead>
                      <TableHead className="h-10">Time</TableHead>
                      <TableHead className="h-10">Type</TableHead>
                      <TableHead className="h-10">Status</TableHead>
                      <TableHead className="h-10 text-right">Distance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayCheckins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                          No check-ins yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      todayCheckins.map((checkin) => (
                        <TableRow key={checkin.id} className="hover:bg-muted/50">
                          <TableCell className="py-2">
                            {checkin.photoUrl ? (
                              <a href={checkin.photoUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={checkin.photoUrl}
                                  alt="Attendance selfie"
                                  className="h-10 w-10 rounded-md object-cover border border-border"
                                />
                              </a>
                            ) : (
                              <div className="grid h-10 w-10 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
                                <Camera className="h-4 w-4" />
                              </div>
                            )}
                          </TableCell>
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

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-brand" />
                Leave / Absence Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Can't make it in? Apply for leave — your request goes to your manager for approval.
              </p>
              <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
                    <CalendarPlus className="h-4 w-4" />
                    Apply for Leave
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply for Leave</DialogTitle>
                    <DialogDescription>
                      Submit a leave request for approval. It appears in the absent report as
                      pending until reviewed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Date *</Label>
                      <Input
                        type="date"
                        value={leaveForm.date}
                        onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                        className="mt-1 h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Leave Type *</Label>
                      <Select
                        value={leaveForm.type}
                        onValueChange={(v) => setLeaveForm({ ...leaveForm, type: v })}
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
                        placeholder="Optional reason for leave"
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        className="mt-1 h-10"
                      />
                    </div>
                    <Button
                      onClick={handleApplyLeave}
                      disabled={applyLeave.isPending}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      {applyLeave.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {myLeaveRequests.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">My recent requests</p>
                  {myLeaveRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.leaveType}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : r.status === "Pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
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
