import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  AbsentRecord,
  AttendanceDashboard,
  AttendanceReport,
  AttendanceSetting,
  CheckInLog,
  DailyLog,
  EmployeeAttendance,
  EmployeeCheckin,
  EmployeeMonthlySummary,
  LateArrival,
  LiveTracking,
  OfficeLocation,
  ShiftConfig,
} from "@/types/attendance";

function like(value: string) {
  return `%${value}%`;
}

export function useAttendanceDashboard() {
  return useQuery({
    queryKey: ["attendance", "dashboard"],
    queryFn: async (): Promise<AttendanceDashboard> => {
      const { data, error } = await supabase.from("attendance_dashboard").select("data").single();
      if (error) {
        console.error("Supabase error fetching dashboard:", error);
        throw error;
      }
      console.log("Dashboard data from Supabase:", data);
      return data.data as AttendanceDashboard;
    },
  });
}

export function useDailyLogs(search?: string) {
  return useQuery({
    queryKey: ["attendance", "daily-logs", search ?? ""],
    queryFn: async (): Promise<DailyLog[]> => {
      let query = supabase
        .from("daily_logs")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, checkInTime:check_in_time, checkOutTime:check_out_time, status, branch, location, notes",
        );
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},employee_id.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching daily logs from Supabase:", error);
        throw error;
      }
      console.log("Daily logs loaded from Supabase:", data);
      return data as unknown as DailyLog[];
    },
  });
}

export function useEmployeeAttendance(search?: string) {
  return useQuery({
    queryKey: ["attendance", "employee", search ?? ""],
    queryFn: async (): Promise<EmployeeAttendance[]> => {
      let query = supabase
        .from("employee_attendance")
        .select(
          "id, employeeId:employee_id, employeeName:employee_name, designation, branch, totalPresent:total_present, totalAbsent:total_absent, totalLate:total_late, totalLeave:total_leave, attendancePercentage:attendance_percentage, lastCheckIn:last_check_in",
        );
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},employee_id.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching employee attendance from Supabase:", error);
        throw error;
      }
      console.log("Employee attendance loaded from Supabase:", data);
      return data as unknown as EmployeeAttendance[];
    },
  });
}

export function useLateArrivals(search?: string) {
  return useQuery({
    queryKey: ["attendance", "late-arrivals", search ?? ""],
    queryFn: async (): Promise<LateArrival[]> => {
      let query = supabase
        .from("late_arrivals")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, checkInTime:check_in_time, latenessMinutes:lateness_minutes, branch, status",
        );
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},branch.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching late arrivals from Supabase:", error);
        throw error;
      }
      console.log("Late arrivals loaded from Supabase:", data);
      return data as unknown as LateArrival[];
    },
  });
}

export function useAbsentRecords(search?: string) {
  return useQuery({
    queryKey: ["attendance", "absent-records", search ?? ""],
    queryFn: async (): Promise<AbsentRecord[]> => {
      let query = supabase
        .from("absent_records")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, designation, branch, leaveType:leave_type, reason, status",
        );
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},branch.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching absent records from Supabase:", error);
        throw error;
      }
      console.log("Absent records loaded from Supabase:", data);
      return data as unknown as AbsentRecord[];
    },
  });
}

export function useLiveTracking(search?: string) {
  return useQuery({
    queryKey: ["attendance", "live-tracking", search ?? ""],
    queryFn: async (): Promise<LiveTracking[]> => {
      let query = supabase
        .from("live_tracking")
        .select(
          "id, employeeId:employee_id, employeeName:employee_name, designation, checkInTime:check_in_time, currentStatus:current_status, location, temperature, lastLocation:last_location, gpsVerified:gps_verified, photoVerified:photo_verified",
        );
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},location.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching live tracking from Supabase:", error);
        throw error;
      }
      console.log("Live tracking loaded from Supabase:", data);
      return data as unknown as LiveTracking[];
    },
  });
}

export function useAttendanceReports(search?: string) {
  return useQuery({
    queryKey: ["attendance", "reports", search ?? ""],
    queryFn: async (): Promise<AttendanceReport[]> => {
      let query = supabase
        .from("attendance_reports")
        .select("id, reportName:report_name, period, generatedOn:generated_on, format, status");
      if (search) query = query.ilike("report_name", like(search));
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching attendance reports from Supabase:", error);
        throw error;
      }
      console.log("Attendance reports loaded from Supabase:", data);
      return data as unknown as AttendanceReport[];
    },
  });
}

export function useShiftConfigs(search?: string) {
  return useQuery({
    queryKey: ["attendance", "shift-configs", search ?? ""],
    queryFn: async (): Promise<ShiftConfig[]> => {
      let query = supabase
        .from("shift_configs")
        .select(
          "id, shiftName:shift_name, startTime:start_time, endTime:end_time, gracePeriodMinutes:grace_period_minutes, geofenceRadius:geofence_radius, requiresGPS:requires_gps, requiresPhoto:requires_photo, applicableDays:applicable_days",
        );
      if (search) query = query.ilike("shift_name", like(search));
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching shift configs from Supabase:", error);
        throw error;
      }
      console.log("Shift configs loaded from Supabase:", data);
      return data as unknown as ShiftConfig[];
    },
  });
}

export function useAttendanceSettings(search?: string) {
  return useQuery({
    queryKey: ["attendance", "settings", search ?? ""],
    queryFn: async (): Promise<AttendanceSetting[]> => {
      let query = supabase.from("attendance_settings").select("id, name, type, value, description");
      if (search) query = query.ilike("name", like(search));
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching attendance settings from Supabase:", error);
        throw error;
      }
      console.log("Attendance settings loaded from Supabase:", data);
      return data as unknown as AttendanceSetting[];
    },
  });
}

export function useSubmitCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckInLog) => {
      const { error } = await supabase.from("daily_logs").insert({
        employee_id: input.employeeId,
        check_time: input.checkTime,
        check_type: input.checkType,
        location: input.location,
        temperature: input.temperature,
        photo_url: input.photoUrl,
        gps_coordinates: input.gpsCoordinates,
        notes: input.notes,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useUpdateShiftConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShiftConfig) => {
      const { error } = await supabase
        .from("shift_configs")
        .update({
          shift_name: input.shiftName,
          start_time: input.startTime,
          end_time: input.endTime,
          grace_period_minutes: input.gracePeriodMinutes,
          geofence_radius: input.geofenceRadius,
          requires_gps: input.requiresGPS,
          requires_photo: input.requiresPhoto,
          applicable_days: input.applicableDays,
        })
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useUpdateAttendanceSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AttendanceSetting) => {
      const { error } = await supabase
        .from("attendance_settings")
        .update({
          value: input.value,
          description: input.description,
        })
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Employee Self-Service Check-in with Geofencing
// ──────────────────────────────────────────────────────────────────────────────

export function useOfficeLocations() {
  return useQuery({
    queryKey: ["attendance", "office-locations"],
    queryFn: async (): Promise<OfficeLocation[]> => {
      const { data, error } = await supabase.from("office_locations").select(
        "id, name, branch, latitude, longitude, radius_meters:radiusMeters, address",
      );
      if (error) {
        console.error("Error fetching office locations:", error);
        throw error;
      }
      console.log("Office locations loaded:", data);
      return data as unknown as OfficeLocation[];
    },
  });
}

export function useEmployeeCheckins(employeeId: string, checkDate?: string) {
  return useQuery({
    queryKey: ["attendance", "employee-checkins", employeeId, checkDate ?? ""],
    queryFn: async (): Promise<EmployeeCheckin[]> => {
      let query = supabase
        .from("employee_checkins")
        .select(
          "id, employee_id:employeeId, employee_name:employeeName, branch, check_date:checkDate, check_type:checkType, check_time:checkTime, latitude, longitude, geofence_verified:geofenceVerified, distance_from_office_m:distanceFromOfficeM, geofence_error_message:geofenceErrorMessage, status, notes",
        )
        .eq("employee_id", employeeId);

      if (checkDate) query = query.eq("check_date", checkDate);

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching employee check-ins:", error);
        throw error;
      }
      console.log("Employee check-ins loaded:", data);
      return data as unknown as EmployeeCheckin[];
    },
  });
}

export function useEmployeeMonthlySummary(employeeId: string, year?: number, month?: number) {
  const now = new Date();
  const defaultYear = year || now.getFullYear();
  const defaultMonth = month || now.getMonth() + 1;

  return useQuery({
    queryKey: ["attendance", "employee-monthly-summary", employeeId, defaultYear, defaultMonth],
    queryFn: async (): Promise<EmployeeMonthlySummary | null> => {
      const { data, error } = await supabase
        .from("employee_monthly_summary")
        .select(
          "id, employee_id:employeeId, employee_name:employeeName, branch, year, month, working_days:workingDays, present_days:presentDays, absent_days:absentDays, late_days:lateDays, leave_days:leaveDays, attendance_percentage:attendancePercentage",
        )
        .eq("employee_id", employeeId)
        .eq("year", defaultYear)
        .eq("month", defaultMonth)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows found" which is ok
        console.error("Error fetching employee monthly summary:", error);
        throw error;
      }

      console.log("Employee monthly summary loaded:", data);
      return (data as unknown as EmployeeMonthlySummary) || null;
    },
  });
}

interface GeofenceCheckInput {
  employeeId: string;
  employeeName: string;
  branch: string;
  latitude: number;
  longitude: number;
  checkType: "check-in" | "check-out";
  officeLocation: OfficeLocation;
}

interface GeofenceCheckResult {
  isWithinGeofence: boolean;
  distanceM: number;
  errorMessage?: string;
}

export function calculateGeofenceDistance(
  empLat: number,
  empLon: number,
  officeLat: number,
  officeLon: number,
): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (empLat * Math.PI) / 180;
  const phi2 = (officeLat * Math.PI) / 180;
  const deltaPhi = ((officeLat - empLat) * Math.PI) / 180;
  const deltaLambda = ((officeLon - empLon) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function validateGeofence(input: GeofenceCheckInput): GeofenceCheckResult {
  const distance = calculateGeofenceDistance(
    input.latitude,
    input.longitude,
    Number(input.officeLocation.latitude),
    Number(input.officeLocation.longitude),
  );

  const isWithinGeofence = distance <= input.officeLocation.radiusMeters;

  return {
    isWithinGeofence,
    distanceM: Math.round(distance * 10) / 10,
    errorMessage: isWithinGeofence
      ? undefined
      : `You are ${Math.round(distance - input.officeLocation.radiusMeters)}m outside the office premises. Please move closer to mark attendance.`,
  };
}

export function useSubmitEmployeeCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employeeId: string;
      employeeName: string;
      branch: string;
      checkDate: string;
      checkType: "check-in" | "check-out";
      checkTime: string;
      latitude?: number;
      longitude?: number;
      geofenceVerified: boolean;
      distanceFromOfficeM?: number;
      geofenceErrorMessage?: string;
      status: "success" | "outside_geofence" | "gps_error";
      notes?: string;
    }) => {
      const { error } = await supabase.from("employee_checkins").insert({
        employee_id: input.employeeId,
        employee_name: input.employeeName,
        branch: input.branch,
        check_date: input.checkDate,
        check_type: input.checkType,
        check_time: input.checkTime,
        latitude: input.latitude,
        longitude: input.longitude,
        geofence_verified: input.geofenceVerified,
        distance_from_office_m: input.distanceFromOfficeM,
        geofence_error_message: input.geofenceErrorMessage,
        status: input.status,
        notes: input.notes,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "employee-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "employee-monthly-summary"] });
    },
  });
}
