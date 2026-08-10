import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Employee,
  EmployeeLogin,
  EmployeeLocation,
  EmployeeReport,
  EmployeeProfile,
} from "@/types/employees";
import type { ShiftConfig } from "@/types/attendance";

function like(value: string) {
  return `%${value}%`;
}

export function useEmployees(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["employees", "list", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Employee[]> => {
      let query = supabase
        .from("employees")
        .select(
          "id, name, email, phone, role, branch, joinDate:join_date, status, salary, shiftId:shift_id",
        );
      if (!allBranches) query = query.eq("branch", branch);
      if (search)
        query = query.or(
          `name.ilike.${like(search)},email.ilike.${like(search)},phone.ilike.${like(search)}`,
        );
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as unknown as Employee[];
    },
  });
}

// The shift an employee is assigned to (for gating self-service check-in/out
// to their shift window on the employee-checkin page). Two-step fetch — no
// embedded PostgREST relationship selects are used elsewhere in this codebase.
export function useEmployeeShift(employeeId?: string) {
  return useQuery({
    queryKey: ["employees", "shift", employeeId ?? ""],
    queryFn: async (): Promise<ShiftConfig | null> => {
      if (!employeeId) return null;
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("shift_id")
        .eq("id", employeeId)
        .single();
      if (empError) throw empError;
      if (!employee?.shift_id) return null;

      const { data: shift, error: shiftError } = await supabase
        .from("shift_configs")
        .select(
          "id, shiftName:shift_name, startTime:start_time, endTime:end_time, gracePeriodMinutes:grace_period_minutes, geofenceRadius:geofence_radius, requiresGPS:requires_gps, requiresPhoto:requires_photo, applicableDays:applicable_days",
        )
        .eq("id", employee.shift_id)
        .single();
      if (shiftError) throw shiftError;
      return shift as unknown as ShiftConfig;
    },
    enabled: !!employeeId,
  });
}

// 09:15 AM shift start + grace, matching the cutoff used elsewhere (Dashboard
// attendance chart, Attendance Overview trend).
const LATE_CUTOFF_MINUTES = 9 * 60 + 15;
const ATTENDANCE_WINDOW_DAYS = 30;

function parseTimeToMinutes(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export function useEmployeeProfile(employeeId?: string) {
  return useQuery({
    queryKey: ["employees", "profile", employeeId ?? ""],
    queryFn: async (): Promise<EmployeeProfile | null> => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, name, email, phone, role, branch, joinDate:join_date, salary, status, shiftId:shift_id, address, emergencyContact:emergency_contact",
        )
        .eq("id", employeeId)
        .single();
      if (error) throw error;

      // Resolve the assigned shift's display name (two-step: no embedded
      // PostgREST relationship selects are used elsewhere in this codebase).
      let shiftName: string | undefined;
      if (data?.shiftId) {
        const { data: shift } = await supabase
          .from("shift_configs")
          .select("shift_name, start_time, end_time")
          .eq("id", data.shiftId)
          .single();
        if (shift) shiftName = `${shift.shift_name} (${shift.start_time} - ${shift.end_time})`;
      }

      // Real attendance for this specific employee over the last 30 days —
      // previously hardcoded to 18/2/3/90% identically for every employee.
      const since = new Date();
      since.setDate(since.getDate() - (ATTENDANCE_WINDOW_DAYS - 1));
      const { data: checkins } = await supabase
        .from("employee_checkins")
        .select("check_date, check_time")
        .eq("employee_id", employeeId)
        .eq("check_type", "check-in")
        .gte("check_date", since.toISOString().slice(0, 10));

      const firstCheckinByDate = new Map<string, number>();
      (checkins ?? []).forEach((c) => {
        const mins = parseTimeToMinutes(c.check_time);
        if (mins === null) return;
        const prev = firstCheckinByDate.get(c.check_date);
        if (prev === undefined || mins < prev) firstCheckinByDate.set(c.check_date, mins);
      });
      const daysPresent = new Set((checkins ?? []).map((c) => c.check_date)).size;
      const daysLate = [...firstCheckinByDate.values()].filter(
        (m) => m > LATE_CUTOFF_MINUTES,
      ).length;
      const daysAbsent = Math.max(0, ATTENDANCE_WINDOW_DAYS - daysPresent);
      const attendanceRate = `${Math.round((daysPresent / ATTENDANCE_WINDOW_DAYS) * 100)}%`;

      return {
        ...data,
        shiftName,
        // Kept as the raw stored value ("" when unset) — the profile page shows
        // "Not set" for empty, and the edit form prefills cleanly.
        address: data.address ?? "",
        emergencyContact: data.emergencyContact ?? "",
        daysPresent,
        daysAbsent,
        daysLate,
        attendanceRate,
      } as unknown as EmployeeProfile;
    },
  });
}

export function useEmployeeLogins(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["employees", "logins", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<EmployeeLogin[]> => {
      let query = supabase
        .from("employee_logins")
        .select(
          "id, employeeId:employee_id, employeeName:employee_name, employeeRole:employee_role, branch, loginTime:login_time, logoutTime:logout_time, duration, status, lastSeen:last_seen",
        );
      if (!allBranches) query = query.eq("branch", branch);
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},branch.ilike.${like(search)}`);
      const { data, error } = await query.order("login_time", { ascending: false });
      if (error) throw error;
      return data as unknown as EmployeeLogin[];
    },
  });
}

export function useEmployeeLocations(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["employees", "locations", branch ?? "all"],
    queryFn: async (): Promise<EmployeeLocation[]> => {
      let query = supabase
        .from("employee_locations")
        .select(
          "id, employeeId:employee_id, employeeName:employee_name, branch, latitude, longitude, address, timestamp, accuracy",
        );
      if (!allBranches) query = query.eq("branch", branch);
      const { data, error } = await query.order("timestamp", { ascending: false });
      if (error) throw error;
      return data as unknown as EmployeeLocation[];
    },
  });
}

export function useEmployeeReports() {
  return useQuery({
    queryKey: ["employees", "reports"],
    queryFn: async (): Promise<EmployeeReport[]> => {
      const { data, error } = await supabase
        .from("employee_reports")
        .select("id, report, period, generated, status")
        .order("generated", { ascending: false });
      if (error) throw error;
      return data as unknown as EmployeeReport[];
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employee: Omit<Employee, "id">) => {
      const insertData: Record<string, unknown> = {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        branch: employee.branch,
        join_date: employee.joinDate,
        status: employee.status,
        salary: employee.salary,
        shift_id: employee.shiftId || null,
        address: employee.address || null,
        emergency_contact: employee.emergencyContact || null,
      };

      if (employee.password) {
        insertData.password_hash = await hashPassword(employee.password);
      }

      const { error } = await supabase.from("employees").insert(insertData);
      if (error) throw error;
      return employee;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employee: Employee) => {
      const { error } = await supabase
        .from("employees")
        .update({
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          branch: employee.branch,
          join_date: employee.joinDate,
          status: employee.status,
          salary: employee.salary,
          shift_id: employee.shiftId || null,
          address: employee.address || null,
          emergency_contact: employee.emergencyContact || null,
        })
        .eq("id", employee.id);
      if (error) throw error;
      return employee;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", employeeId);
      if (error) throw error;
      return employeeId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}
