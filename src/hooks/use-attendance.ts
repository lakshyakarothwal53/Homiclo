import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { inRange, parseRowDate } from "@/lib/report-data";
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

// Overview stats are computed live from employees + employee_checkins +
// late_arrivals + absent_records (the attendance_dashboard seed row is no
// longer used — it went stale the moment real check-ins started).
export function useAttendanceDashboard() {
  return useQuery({
    queryKey: ["attendance", "dashboard"],
    queryFn: async (): Promise<AttendanceDashboard> => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const todayLabel = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, role");
      if (empError) throw empError;
      const totalEmployees = employees?.length ?? 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const { data: checkins, error: chkError } = await supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_type, check_time, status")
        .eq("check_type", "check-in")
        .gte("check_date", weekAgo.toISOString().slice(0, 10));
      if (chkError) throw chkError;

      const presentToday = new Set(
        (checkins ?? []).filter((c) => c.check_date === todayIso).map((c) => c.employee_id),
      ).size;

      const { data: lateRows } = await supabase
        .from("late_arrivals")
        .select(
          "id, date, employee_id, employee_name, check_in_time, lateness_minutes, branch, status",
        );
      // Late Arrivals today = the seeded rows dated today PLUS real self-service
      // check-ins whose first check-in of the day is past the grace cutoff — the
      // same derivation the Late Arrivals page uses, so this KPI matches it.
      const firstCheckinToday = new Map<string, number>();
      (checkins ?? [])
        .filter((c) => c.check_date === todayIso && (!c.status || c.status === "success"))
        .forEach((c) => {
          const mins = parseTimeToMinutes(c.check_time);
          if (mins === null) return;
          const prev = firstCheckinToday.get(c.employee_id);
          if (prev === undefined || mins < prev) firstCheckinToday.set(c.employee_id, mins);
        });
      const derivedLateToday = [...firstCheckinToday.values()].filter(
        (m) => m > LATE_CUTOFF_MINUTES,
      ).length;
      const seedLateToday = (lateRows ?? []).filter((l) => l.date === todayLabel).length;
      const lateToday = derivedLateToday + seedLateToday;

      const { data: absentRows } = await supabase
        .from("absent_records")
        .select("id")
        .eq("date", todayLabel);
      const onLeave = absentRows?.length ?? 0;

      // Attendance % for today only: how much of the roster is actually
      // present today (presentToday over the full headcount), not a trailing
      // multi-day average.
      const averageAttendance =
        totalEmployees > 0 ? `${Math.round((presentToday / totalEmployees) * 100)}%` : "0%";

      // Department breakdown: % of each designation's headcount that checked
      // in at least once in the last 7 days. This must stay inside the
      // attendance-tracking dataset's own employee_id space (EMP0xx codes
      // shared by daily_logs/late_arrivals/absent_records/live_tracking/
      // employee_checkins) — the separate `employees` table uses unrelated
      // uuids and names, so joining against it here always produced 0%.
      const [designationRows, liveDesignationRows, rosterRows] = await Promise.all([
        supabase.from("absent_records").select("employee_id, designation"),
        supabase.from("live_tracking").select("employee_id, designation"),
        supabase.from("daily_logs").select("employee_id"),
      ]);
      const designationMap = new Map<string, string>();
      (designationRows.data ?? []).forEach((r) => designationMap.set(r.employee_id, r.designation));
      (liveDesignationRows.data ?? []).forEach((r) =>
        designationMap.set(r.employee_id, r.designation),
      );
      const roster = [...new Set((rosterRows.data ?? []).map((r) => r.employee_id))];

      const attendedEmployeeIds = new Set((checkins ?? []).map((c) => c.employee_id));
      const roleTotals = new Map<string, number>();
      const roleAttended = new Map<string, number>();
      roster.forEach((id) => {
        const dept = designationMap.get(id) ?? "Unassigned";
        roleTotals.set(dept, (roleTotals.get(dept) ?? 0) + 1);
        if (attendedEmployeeIds.has(id)) {
          roleAttended.set(dept, (roleAttended.get(dept) ?? 0) + 1);
        }
      });
      const departmentAttendance = [...roleTotals.entries()].map(([department, total]) => ({
        department,
        percentage: String(
          total > 0 ? Math.round(((roleAttended.get(department) ?? 0) / total) * 100) : 0,
        ),
      }));

      return {
        stats: {
          totalEmployees,
          presentToday,
          absentToday: Math.max(0, totalEmployees - presentToday),
          lateToday,
          averageAttendance,
          onLeave,
        },
        recentLateArrivals: (lateRows ?? []).slice(0, 5).map((l) => ({
          id: l.id,
          date: l.date,
          employeeId: l.employee_id,
          employeeName: l.employee_name,
          checkInTime: l.check_in_time,
          latenessMinutes: l.lateness_minutes,
          branch: l.branch,
          status: l.status,
        })) as AttendanceDashboard["recentLateArrivals"],
        departmentAttendance,
      };
    },
  });
}

const LATE_CUTOFF_MINUTES = 9 * 60 + 15; // 09:15 AM shift start + grace
const SHIFT_START_MINUTES = 9 * 60; // 09:00 AM shift start — lateness measured from here

// ISO "2026-07-11" → "11 Jul 2026", matching the display shape of the seeded
// late_arrivals/absent_records rows so both sources render identically.
function isoToDisplayDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// "09:31 AM" → minutes since midnight, or null when unparseable.
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

export interface AttendanceTrendPoint {
  day: string;
  present: number;
  late: number;
  absent: number;
}

// Day-by-day present/late/absent for a true trailing 7-calendar-day window
// (today back 6 days), built from employee_checkins. Scoped to the roster
// size seen in daily_logs (the attendance module's own employee_id space;
// see the department-breakdown comment in useAttendanceDashboard for why
// this can't be cross-referenced against the `employees` table). Days with
// no check-in rows still render as a bar (0 present, roster absent) — the
// window is fixed at 7 real days, not however many distinct dates happen to
// have data.
export function useAttendanceTrend() {
  return useQuery({
    queryKey: ["attendance", "trend"],
    queryFn: async (): Promise<AttendanceTrendPoint[]> => {
      // Use the real employee headcount as the roster denominator — the same
      // total the Attendance Overview "Absent" KPI divides against — so the
      // chart's Absent count matches the card instead of diverging (the old
      // daily_logs-derived roster was a different, smaller seed dataset).
      const { data: rosterRows, error: rosterError } = await supabase
        .from("employees")
        .select("id");
      if (rosterError) throw rosterError;
      const totalRoster = rosterRows?.length ?? 0;

      const last7Dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Dates.push(d.toISOString().slice(0, 10));
      }

      const { data: checkins, error } = await supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_time")
        .eq("check_type", "check-in")
        .gte("check_date", last7Dates[0])
        .lte("check_date", last7Dates[last7Dates.length - 1]);
      if (error) throw error;

      const byDate = new Map<string, { employee_id: string; check_time: string | null }[]>();
      (checkins ?? []).forEach((c) => {
        if (!byDate.has(c.check_date)) byDate.set(c.check_date, []);
        byDate.get(c.check_date)!.push(c);
      });

      return last7Dates.map((date) => {
        const rows = byDate.get(date) ?? [];
        const firstCheckin = new Map<string, number>();
        rows.forEach((c) => {
          const mins = parseTimeToMinutes(c.check_time);
          if (mins === null) return;
          const prev = firstCheckin.get(c.employee_id);
          if (prev === undefined || mins < prev) firstCheckin.set(c.employee_id, mins);
        });
        const uniquePresent = new Set(rows.map((c) => c.employee_id)).size;
        const lateCount = [...firstCheckin.values()].filter(
          (mins) => mins > LATE_CUTOFF_MINUTES,
        ).length;
        const day = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return {
          day,
          present: Math.max(0, uniquePresent - lateCount),
          late: lateCount,
          absent: Math.max(0, totalRoster - uniquePresent),
        };
      });
    },
  });
}

// Daily logs = the seeded `daily_logs` back-office rows PLUS every real
// self-service check-in from `employee_checkins`, so the log reflects live
// attendance (on-time and late) instead of only the demo rows. Each employee's
// check-ins for a day roll up into one row: earliest check-in, latest
// check-out, and Present/Late decided by the grace cutoff. Search is applied
// client-side over the merged set.
export function useDailyLogs(search?: string) {
  return useQuery({
    queryKey: ["attendance", "daily-logs", search ?? ""],
    queryFn: async (): Promise<DailyLog[]> => {
      const { data: seedRows, error } = await supabase
        .from("daily_logs")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, checkInTime:check_in_time, checkOutTime:check_out_time, status, branch, location, notes",
        );
      if (error) {
        console.error("Error fetching daily logs from Supabase:", error);
        throw error;
      }

      const { data: checkins, error: chkError } = await supabase
        .from("employee_checkins")
        .select("employee_id, employee_name, branch, check_date, check_type, check_time, status");
      if (chkError) throw chkError;

      type Agg = {
        employeeId: string;
        employeeName: string;
        branch: string;
        date: string;
        inMin: number | null;
        outMin: number | null;
        checkIn: string;
        checkOut: string;
      };
      const byKey = new Map<string, Agg>();
      (checkins ?? []).forEach((c) => {
        if (c.status && c.status !== "success") return;
        const mins = parseTimeToMinutes(c.check_time);
        const key = `${c.employee_id}|${c.check_date}`;
        const cur =
          byKey.get(key) ??
          ({
            employeeId: c.employee_id,
            employeeName: c.employee_name,
            branch: c.branch,
            date: c.check_date,
            inMin: null,
            outMin: null,
            checkIn: "",
            checkOut: "",
          } satisfies Agg);
        if (c.check_type === "check-in") {
          if (mins !== null && (cur.inMin === null || mins < cur.inMin)) {
            cur.inMin = mins;
            cur.checkIn = c.check_time;
          }
        } else if (c.check_type === "check-out") {
          if (mins !== null && (cur.outMin === null || mins > cur.outMin)) {
            cur.outMin = mins;
            cur.checkOut = c.check_time;
          }
        }
        byKey.set(key, cur);
      });

      const derived = [...byKey.values()].map(
        (a): DailyLog => ({
          id: `chk-${a.employeeId}-${a.date}`,
          date: isoToDisplayDate(a.date),
          employeeId: a.employeeId,
          employeeName: a.employeeName,
          checkInTime: a.checkIn,
          checkOutTime: a.checkOut,
          status: a.inMin !== null && a.inMin > LATE_CUTOFF_MINUTES ? "Late" : "Present",
          branch: a.branch,
        }),
      );

      const all = [...derived, ...((seedRows ?? []) as unknown as DailyLog[])];
      const q = search?.trim().toLowerCase();
      const filtered = q
        ? all.filter(
            (r) =>
              r.employeeName.toLowerCase().includes(q) || r.employeeId.toLowerCase().includes(q),
          )
        : all;

      // Newest first, and within a day the latest check-out (falling back to
      // check-in) rises to the top so the most recent activity leads.
      const latestMinutes = (l: DailyLog) =>
        parseTimeToMinutes(l.checkOutTime) ?? parseTimeToMinutes(l.checkInTime) ?? -1;
      return filtered.sort((a, b) => {
        const da = parseRowDate(a.date)?.getTime() ?? 0;
        const db = parseRowDate(b.date)?.getTime() ?? 0;
        if (db !== da) return db - da;
        return latestMinutes(b) - latestMinutes(a);
      });
    },
  });
}

export type AttendancePeriodOpts = { from?: string; to?: string };

/**
 * Roster (id/name/designation/branch) comes from employee_attendance — that
 * part is static reference data, not a date-scoped fact. The present/absent/
 * late/leave counts and attendance % are computed live from daily_logs
 * (per-day status per employee) and absent_records (leave_type), scoped to
 * the selected period — the stored employee_attendance totals have no date
 * column at all, so they can't answer "for this month" and are only used
 * here for roster identity, never for the counts.
 */
export function useEmployeeAttendance(search?: string, opts: AttendancePeriodOpts = {}) {
  return useQuery({
    queryKey: ["attendance", "employee", search ?? "", opts.from ?? "", opts.to ?? ""],
    queryFn: async (): Promise<EmployeeAttendance[]> => {
      let rosterQuery = supabase
        .from("employee_attendance")
        .select("employee_id, employee_name, designation, branch, last_check_in");
      if (search)
        rosterQuery = rosterQuery.or(
          `employee_name.ilike.${like(search)},employee_id.ilike.${like(search)}`,
        );
      const { data: roster, error: rosterError } = await rosterQuery;
      if (rosterError) throw rosterError;

      const { data: logs, error: logsError } = await supabase
        .from("daily_logs")
        .select("employee_id, date, status");
      if (logsError) throw logsError;

      const { data: leaves, error: leavesError } = await supabase
        .from("absent_records")
        .select("employee_id, date, leave_type");
      if (leavesError) throw leavesError;

      const inWindow = (date: string) => inRange(parseRowDate(date), opts.from, opts.to);

      const countsByEmployee = new Map<
        string,
        { present: number; absent: number; late: number; leave: number }
      >();
      (logs ?? [])
        .filter((l) => inWindow(l.date))
        .forEach((l) => {
          const c = countsByEmployee.get(l.employee_id) ?? {
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
          };
          if (l.status === "Present") c.present += 1;
          else if (l.status === "Late") c.late += 1;
          else if (l.status === "Absent") c.absent += 1;
          countsByEmployee.set(l.employee_id, c);
        });
      (leaves ?? [])
        .filter((l) => l.leave_type && inWindow(l.date))
        .forEach((l) => {
          const c = countsByEmployee.get(l.employee_id) ?? {
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
          };
          c.leave += 1;
          countsByEmployee.set(l.employee_id, c);
        });

      return (roster ?? []).map((r) => {
        const c = countsByEmployee.get(r.employee_id) ?? {
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
        };
        const totalTracked = c.present + c.absent + c.late;
        const attendancePercentage =
          totalTracked > 0 ? `${((c.present / totalTracked) * 100).toFixed(2)}%` : "0.00%";
        return {
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          designation: r.designation,
          branch: r.branch,
          totalPresent: c.present,
          totalAbsent: c.absent,
          totalLate: c.late,
          totalLeave: c.leave,
          attendancePercentage,
          lastCheckIn: r.last_check_in ?? undefined,
        } satisfies EmployeeAttendance;
      });
    },
  });
}

// Late arrivals come from two sources merged into one list:
//   1. the seeded `late_arrivals` table (demo/back-office records), and
//   2. real self-service check-ins in `employee_checkins` whose first check-in
//      of the day is past the grace cutoff — these carry the *actual* check-in
//      date, so the listing reflects live attendance instead of only stale seed
//      rows. Search + date filtering happen client-side over the merged set.
export function useLateArrivals(search?: string) {
  return useQuery({
    queryKey: ["attendance", "late-arrivals", search ?? ""],
    queryFn: async (): Promise<LateArrival[]> => {
      const { data: seedRows, error } = await supabase
        .from("late_arrivals")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, checkInTime:check_in_time, latenessMinutes:lateness_minutes, branch, status",
        );
      if (error) {
        console.error("Error fetching late arrivals from Supabase:", error);
        throw error;
      }

      const { data: checkins, error: chkError } = await supabase
        .from("employee_checkins")
        .select("employee_id, employee_name, branch, check_date, check_type, check_time, status")
        .eq("check_type", "check-in");
      if (chkError) throw chkError;

      // Keep only each employee's earliest check-in per day, then flag the ones
      // past the grace cutoff as late (lateness measured from the 09:00 start).
      const firstByKey = new Map<
        string,
        {
          employeeId: string;
          employeeName: string;
          branch: string;
          date: string;
          minutes: number;
          checkTime: string;
        }
      >();
      (checkins ?? []).forEach((c) => {
        if (c.status && c.status !== "success") return;
        const mins = parseTimeToMinutes(c.check_time);
        if (mins === null) return;
        const key = `${c.employee_id}|${c.check_date}`;
        const prev = firstByKey.get(key);
        if (!prev || mins < prev.minutes) {
          firstByKey.set(key, {
            employeeId: c.employee_id,
            employeeName: c.employee_name,
            branch: c.branch,
            date: c.check_date,
            minutes: mins,
            checkTime: c.check_time,
          });
        }
      });

      const derived: LateArrival[] = [...firstByKey.values()]
        .filter((r) => r.minutes > LATE_CUTOFF_MINUTES)
        .map((r) => ({
          id: `chk-${r.employeeId}-${r.date}`,
          date: isoToDisplayDate(r.date),
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          checkInTime: r.checkTime,
          latenessMinutes: r.minutes - SHIFT_START_MINUTES,
          branch: r.branch,
          status: "Late",
        }));

      const all = [...derived, ...((seedRows ?? []) as unknown as LateArrival[])];
      const q = search?.trim().toLowerCase();
      const filtered = q
        ? all.filter(
            (r) => r.employeeName.toLowerCase().includes(q) || r.branch.toLowerCase().includes(q),
          )
        : all;

      // Newest date first, and within a day the latest check-in rises to the
      // top so the most recent late arrival leads the list.
      return filtered.sort((a, b) => {
        const da = parseRowDate(a.date)?.getTime() ?? 0;
        const db = parseRowDate(b.date)?.getTime() ?? 0;
        if (db !== da) return db - da;
        return (
          (parseTimeToMinutes(b.checkInTime) ?? -1) - (parseTimeToMinutes(a.checkInTime) ?? -1)
        );
      });
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
      // Newest date first so the most recent absence leads the list.
      return (data as unknown as AbsentRecord[]).sort(
        (a, b) => (parseRowDate(b.date)?.getTime() ?? 0) - (parseRowDate(a.date)?.getTime() ?? 0),
      );
    },
  });
}

export type AbsentRecordInput = {
  date: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  branch: string;
  leaveType: string;
  reason: string;
};

export function useCreateAbsentRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AbsentRecordInput): Promise<AbsentRecordInput> => {
      const { error } = await supabase.from("absent_records").insert({
        date: input.date,
        employee_id: input.employeeId,
        employee_name: input.employeeName,
        designation: input.designation,
        branch: input.branch,
        leave_type: input.leaveType,
        reason: input.reason,
        status: "Absent",
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export type LeaveRequestInput = {
  date: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  branch: string;
  leaveType: string;
  reason: string;
};

// Employee self-service leave application (from their own dashboard). Lands in
// absent_records with status "Pending" so it shows up as an approval request in
// the Absent Report, distinct from admin-entered "Absent" rows.
export function useApplyLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveRequestInput): Promise<LeaveRequestInput> => {
      const { error } = await supabase.from("absent_records").insert({
        date: input.date,
        employee_id: input.employeeId,
        employee_name: input.employeeName,
        designation: input.designation,
        branch: input.branch,
        leave_type: input.leaveType,
        reason: input.reason,
        status: "Pending",
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
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

export function useCreateAttendanceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reportName: string; period: string; format: string }) => {
      const generatedOn = new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const { error } = await supabase.from("attendance_reports").insert({
        report_name: input.reportName,
        period: input.period,
        generated_on: generatedOn,
        format: input.format,
        status: "Ready",
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "reports"] });
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
      const { data, error } = await supabase
        .from("office_locations")
        .select("id, name, branch, latitude, longitude, radiusMeters:radius_meters, address");
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
          "id, employeeId:employee_id, employeeName:employee_name, branch, checkDate:check_date, checkType:check_type, checkTime:check_time, latitude, longitude, geofenceVerified:geofence_verified, distanceFromOfficeM:distance_from_office_m, geofenceErrorMessage:geofence_error_message, status, notes",
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
          "id, employeeId:employee_id, employeeName:employee_name, branch, year, month, workingDays:working_days, presentDays:present_days, absentDays:absent_days, lateDays:late_days, leaveDays:leave_days, attendancePercentage:attendance_percentage",
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
