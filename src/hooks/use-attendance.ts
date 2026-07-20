import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import {
  inRange,
  parseRowDate,
  LATE_CUTOFF_MINUTES,
  SHIFT_START_MINUTES,
  parseTimeToMinutes,
} from "@/lib/report-data";
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
export function useAttendanceDashboard(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["attendance", "dashboard", branch ?? "all"],
    queryFn: async (): Promise<AttendanceDashboard> => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const todayLabel = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      let empQuery = supabase.from("employees").select("id, role, branch");
      if (!allBranches) empQuery = empQuery.eq("branch", branch);
      const { data: employees, error: empError } = await empQuery;
      if (empError) throw empError;
      const totalEmployees = employees?.length ?? 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      let chkQuery = supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_type, check_time, status")
        .eq("check_type", "check-in")
        .gte("check_date", weekAgo.toISOString().slice(0, 10));
      if (!allBranches) chkQuery = chkQuery.eq("branch", branch);
      const { data: checkins, error: chkError } = await chkQuery;
      if (chkError) throw chkError;

      const presentToday = new Set(
        (checkins ?? []).filter((c) => c.check_date === todayIso).map((c) => c.employee_id),
      ).size;

      let lateQuery = supabase
        .from("late_arrivals")
        .select(
          "id, date, employee_id, employee_name, check_in_time, lateness_minutes, branch, status",
        );
      if (!allBranches) lateQuery = lateQuery.eq("branch", branch);
      const { data: lateRows } = await lateQuery;
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

      // On-leave today counts only records that are actually in force — a
      // still-pending or declined leave request must not be reported as leave.
      let absentQuery = supabase.from("absent_records").select("id, status").eq("date", todayLabel);
      if (!allBranches) absentQuery = absentQuery.eq("branch", branch);
      const { data: absentRows } = await absentQuery;
      const onLeave = (absentRows ?? []).filter(
        (r) => r.status !== "Pending" && r.status !== "Declined",
      ).length;

      // Attendance % for today only: how much of the roster is actually
      // present today (presentToday over the full headcount), not a trailing
      // multi-day average.
      const averageAttendance =
        totalEmployees > 0 ? `${Math.round((presentToday / totalEmployees) * 100)}%` : "0%";

      // Department breakdown: headcount share by real employee position,
      // straight from the `employees` roster already fetched above (the
      // same rows Add/Edit Employee write to) — so newly added employees
      // show up here immediately. Previously this counted designations from
      // the demo EMP0xx dataset (daily_logs/absent_records/live_tracking),
      // which never reflected real employee records.
      const roleTotals = new Map<string, number>();
      (employees ?? []).forEach((e) => {
        const dept = e.role || "Unassigned";
        roleTotals.set(dept, (roleTotals.get(dept) ?? 0) + 1);
      });
      const departmentAttendance = [...roleTotals.entries()].map(([department, count]) => ({
        department,
        count,
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

// ISO "2026-07-11" → "11 Jul 2026", matching the display shape of the seeded
// late_arrivals/absent_records rows so both sources render identically.
function isoToDisplayDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
export function useAttendanceTrend(branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["attendance", "trend", branch ?? "all"],
    queryFn: async (): Promise<AttendanceTrendPoint[]> => {
      // Use the real employee headcount as the roster denominator — the same
      // total the Attendance Overview "Absent" KPI divides against — so the
      // chart's Absent count matches the card instead of diverging (the old
      // daily_logs-derived roster was a different, smaller seed dataset).
      let rosterQuery = supabase.from("employees").select("id");
      if (!allBranches) rosterQuery = rosterQuery.eq("branch", branch);
      const { data: rosterRows, error: rosterError } = await rosterQuery;
      if (rosterError) throw rosterError;
      const totalRoster = rosterRows?.length ?? 0;

      const last7Dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Dates.push(d.toISOString().slice(0, 10));
      }

      let checkinQuery = supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_time")
        .eq("check_type", "check-in")
        .gte("check_date", last7Dates[0])
        .lte("check_date", last7Dates[last7Dates.length - 1]);
      if (!allBranches) checkinQuery = checkinQuery.eq("branch", branch);
      const { data: checkins, error } = await checkinQuery;
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
export function useDailyLogs(search?: string, branch?: string, employeeId?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["attendance", "daily-logs", search ?? "", branch ?? "all", employeeId ?? ""],
    queryFn: async (): Promise<DailyLog[]> => {
      let seedQuery = supabase
        .from("daily_logs")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, checkInTime:check_in_time, checkOutTime:check_out_time, status, branch, location, notes",
        );
      if (!allBranches) seedQuery = seedQuery.eq("branch", branch);
      if (employeeId) seedQuery = seedQuery.eq("employee_id", employeeId);
      const { data: seedRows, error } = await seedQuery;
      if (error) {
        console.error("Error fetching daily logs from Supabase:", error);
        throw error;
      }

      let checkinQuery = supabase
        .from("employee_checkins")
        .select("employee_id, employee_name, branch, check_date, check_type, check_time, status");
      if (!allBranches) checkinQuery = checkinQuery.eq("branch", branch);
      if (employeeId) checkinQuery = checkinQuery.eq("employee_id", employeeId);
      const { data: checkins, error: chkError } = await checkinQuery;
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
 * Roster + attendance counts per employee, computed from real data: the
 * roster is `employees` (the same table Add/Edit Employee write to) and the
 * counts are derived from that employee's own `employee_checkins` +
 * `absent_records` rows — the same per-employee derivation
 * useSelfAttendanceSummary uses for a single login, just batched across the
 * whole roster. This used to read the demo `employee_attendance`/`daily_logs`
 * seed dataset (EMP0xx codes, fictional branches), which never reflected
 * employees actually added through the app. Attendance % always counts late
 * as attended: (present + late) / (present + late + absent), leave excluded.
 */
export function useEmployeeAttendance(
  search?: string,
  opts: AttendancePeriodOpts = {},
  branch?: string,
) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: [
      "attendance",
      "employee",
      search ?? "",
      opts.from ?? "",
      opts.to ?? "",
      branch ?? "all",
    ],
    queryFn: async (): Promise<EmployeeAttendance[]> => {
      let rosterQuery = supabase.from("employees").select("id, name, role, branch");
      if (!allBranches) rosterQuery = rosterQuery.eq("branch", branch);
      const { data: rosterRows, error: rosterError } = await rosterQuery;
      if (rosterError) throw rosterError;

      // Filtered client-side, not via `.ilike` in the query — `employees.id`
      // is a uuid column and Postgres' uuid type has no ilike operator.
      const term = search?.trim().toLowerCase();
      const roster = term
        ? (rosterRows ?? []).filter(
            (r) => r.name.toLowerCase().includes(term) || r.id.toLowerCase().includes(term),
          )
        : (rosterRows ?? []);
      if (roster.length === 0) return [];

      const employeeIds = roster.map((r) => r.id);

      let chkQuery = supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_time, status")
        .eq("check_type", "check-in")
        .in("employee_id", employeeIds);
      if (opts.from) chkQuery = chkQuery.gte("check_date", opts.from);
      if (opts.to) chkQuery = chkQuery.lte("check_date", opts.to);
      const { data: checkins, error: chkError } = await chkQuery;
      if (chkError) throw chkError;

      const { data: absences, error: absError } = await supabase
        .from("absent_records")
        .select("employee_id, date, leave_type, status")
        .in("employee_id", employeeIds);
      if (absError) throw absError;

      const inWindow = (date: string) => inRange(parseRowDate(date), opts.from, opts.to);

      // Earliest check-in per employee per day decides present-vs-late for
      // that day (mirrors useSelfAttendanceSummary).
      const firstCheckinByEmployee = new Map<string, Map<string, number>>();
      (checkins ?? [])
        .filter((c) => !c.status || c.status === "success")
        .forEach((c) => {
          const mins = parseTimeToMinutes(c.check_time);
          if (mins === null) return;
          const byDate = firstCheckinByEmployee.get(c.employee_id) ?? new Map<string, number>();
          const prev = byDate.get(c.check_date);
          if (prev === undefined || mins < prev) byDate.set(c.check_date, mins);
          firstCheckinByEmployee.set(c.employee_id, byDate);
        });

      const absencesByEmployee = new Map<string, { leaveType: string | null; status: string }[]>();
      (absences ?? [])
        .filter((a) => inWindow(a.date))
        .forEach((a) => {
          const list = absencesByEmployee.get(a.employee_id) ?? [];
          list.push({ leaveType: a.leave_type, status: a.status });
          absencesByEmployee.set(a.employee_id, list);
        });

      return roster.map((r) => {
        const byDate = firstCheckinByEmployee.get(r.id);
        const lateDays = byDate
          ? [...byDate.values()].filter((m) => m > LATE_CUTOFF_MINUTES).length
          : 0;
        const presentDays = byDate ? Math.max(0, byDate.size - lateDays) : 0;

        const empAbsences = absencesByEmployee.get(r.id) ?? [];
        // Only approved leave counts — pending/declined requests don't
        // excuse the day (matches fetchMonthlyAttendanceReport in report-data.ts).
        const leaveDays = empAbsences.filter(
          (a) => a.leaveType && a.status === "Approved",
        ).length;
        const absentDays = empAbsences.filter((a) => a.status === "Absent").length;

        // A late arrival still counts as attendance — the employee showed up.
        // Attendance % = (present + late) / tracked days, where tracked days
        // are present + late + absent (approved leave is excluded, not
        // penalised).
        const totalTracked = presentDays + absentDays + lateDays;
        const attended = presentDays + lateDays;
        const attendancePercentage =
          totalTracked > 0 ? `${((attended / totalTracked) * 100).toFixed(2)}%` : "0.00%";
        return {
          employeeId: r.id,
          employeeName: r.name,
          designation: r.role || "Unassigned",
          branch: r.branch,
          totalPresent: presentDays,
          totalAbsent: absentDays,
          totalLate: lateDays,
          totalLeave: leaveDays,
          attendancePercentage,
        } satisfies EmployeeAttendance;
      });
    },
  });
}

/**
 * The logged-in employee's own attendance totals, in the same shape the
 * History page renders.
 *
 * Deliberately NOT read from `employee_attendance`: that table is keyed by the
 * seeded EMP0xx code space and holds demo people, so a real login (a uuid)
 * has no row there and would render an empty page. These figures are derived
 * from the employee's actual check-ins plus their absence/leave records.
 */
export function useSelfAttendanceSummary(employeeId?: string, opts: AttendancePeriodOpts = {}) {
  return useQuery({
    queryKey: ["attendance", "self-summary", employeeId ?? "", opts.from ?? "", opts.to ?? ""],
    enabled: !!employeeId,
    queryFn: async (): Promise<EmployeeAttendance[]> => {
      if (!employeeId) return [];

      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id, name, role, branch")
        .eq("id", employeeId)
        .single();
      if (empError) throw empError;

      let chkQuery = supabase
        .from("employee_checkins")
        .select("check_date, check_time, status")
        .eq("employee_id", employeeId)
        .eq("check_type", "check-in");
      if (opts.from) chkQuery = chkQuery.gte("check_date", opts.from);
      if (opts.to) chkQuery = chkQuery.lte("check_date", opts.to);
      const { data: checkins, error: chkError } = await chkQuery;
      if (chkError) throw chkError;

      // Earliest check-in per day decides present-vs-late for that day.
      const firstByDate = new Map<string, number>();
      (checkins ?? [])
        .filter((c) => !c.status || c.status === "success")
        .forEach((c) => {
          const mins = parseTimeToMinutes(c.check_time);
          if (mins === null) return;
          const prev = firstByDate.get(c.check_date);
          if (prev === undefined || mins < prev) firstByDate.set(c.check_date, mins);
        });
      const lateDays = [...firstByDate.values()].filter((m) => m > LATE_CUTOFF_MINUTES).length;
      const presentDays = Math.max(0, firstByDate.size - lateDays);

      const { data: absences, error: absError } = await supabase
        .from("absent_records")
        .select("date, leave_type, status")
        .eq("employee_id", employeeId);
      if (absError) throw absError;

      const inWindow = (d: string) => inRange(parseRowDate(d), opts.from, opts.to);
      const scopedAbsences = (absences ?? []).filter((a) => inWindow(a.date));
      // Only approved leave counts as leave; a plain absence counts as absent.
      const leaveDays = scopedAbsences.filter(
        (a) => a.leave_type && a.status === "Approved",
      ).length;
      const absentDays = scopedAbsences.filter((a) => a.status === "Absent").length;

      const tracked = presentDays + lateDays + absentDays;
      const attendancePercentage =
        tracked > 0 ? `${(((presentDays + lateDays) / tracked) * 100).toFixed(2)}%` : "0.00%";

      return [
        {
          employeeId: employee.id,
          employeeName: employee.name,
          designation: employee.role,
          branch: employee.branch,
          totalPresent: presentDays,
          totalAbsent: absentDays,
          totalLate: lateDays,
          totalLeave: leaveDays,
          attendancePercentage,
        },
      ];
    },
  });
}

// Late arrivals come from two sources merged into one list:
//   1. the seeded `late_arrivals` table (demo/back-office records), and
//   2. real self-service check-ins in `employee_checkins` whose first check-in
//      of the day is past the grace cutoff — these carry the *actual* check-in
//      date, so the listing reflects live attendance instead of only stale seed
//      rows. Search + date filtering happen client-side over the merged set.
export function useLateArrivals(search?: string, branch?: string, employeeId?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["attendance", "late-arrivals", search ?? "", branch ?? "all", employeeId ?? ""],
    queryFn: async (): Promise<LateArrival[]> => {
      let seedQuery = supabase
        .from("late_arrivals")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, checkInTime:check_in_time, latenessMinutes:lateness_minutes, branch, status",
        );
      if (!allBranches) seedQuery = seedQuery.eq("branch", branch);
      if (employeeId) seedQuery = seedQuery.eq("employee_id", employeeId);
      const { data: seedRows, error } = await seedQuery;
      if (error) {
        console.error("Error fetching late arrivals from Supabase:", error);
        throw error;
      }

      let checkinQuery = supabase
        .from("employee_checkins")
        .select("employee_id, employee_name, branch, check_date, check_type, check_time, status")
        .eq("check_type", "check-in");
      if (!allBranches) checkinQuery = checkinQuery.eq("branch", branch);
      if (employeeId) checkinQuery = checkinQuery.eq("employee_id", employeeId);
      const { data: checkins, error: chkError } = await checkinQuery;
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

export function useAbsentRecords(search?: string, branch?: string, employeeId?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["attendance", "absent-records", search ?? "", branch ?? "all", employeeId ?? ""],
    queryFn: async (): Promise<AbsentRecord[]> => {
      let query = supabase
        .from("absent_records")
        .select(
          "id, date, employeeId:employee_id, employeeName:employee_name, designation, branch, leaveType:leave_type, reason, status",
        );
      if (!allBranches) query = query.eq("branch", branch);
      if (employeeId) query = query.eq("employee_id", employeeId);
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

/**
 * Synthesizes an "Absent" row (not stored anywhere) for every real employee
 * who has no check-in and no existing absent_records entry on `date` — the
 * same "not present today" definition useAttendanceDashboard uses for its
 * Absent KPI. Without this, the Absent Report only ever shows absences
 * someone explicitly logged via "Add New" or a leave request, so its count
 * silently disagreed with the dashboard's inferred figure. Only meaningful
 * for a single specific day, so the caller should skip merging this in when
 * no `date` filter is selected.
 */
export function useInferredAbsences(
  date?: string,
  branch?: string,
  employeeId?: string,
  search?: string,
) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: [
      "attendance",
      "inferred-absences",
      date ?? "",
      branch ?? "all",
      employeeId ?? "",
      search ?? "",
    ],
    enabled: !!date,
    queryFn: async (): Promise<AbsentRecord[]> => {
      if (!date) return [];

      let rosterQuery = supabase.from("employees").select("id, name, role, branch");
      if (!allBranches) rosterQuery = rosterQuery.eq("branch", branch);
      if (employeeId) rosterQuery = rosterQuery.eq("id", employeeId);
      const { data: rosterRows, error: rosterError } = await rosterQuery;
      if (rosterError) throw rosterError;

      const term = search?.trim().toLowerCase();
      const roster = term
        ? (rosterRows ?? []).filter(
            (r) => r.name.toLowerCase().includes(term) || r.branch.toLowerCase().includes(term),
          )
        : (rosterRows ?? []);
      if (roster.length === 0) return [];

      const employeeIds = roster.map((r) => r.id);

      const { data: checkins, error: chkError } = await supabase
        .from("employee_checkins")
        .select("employee_id, status")
        .eq("check_type", "check-in")
        .eq("check_date", date)
        .in("employee_id", employeeIds);
      if (chkError) throw chkError;
      const presentIds = new Set(
        (checkins ?? [])
          .filter((c) => !c.status || c.status === "success")
          .map((c) => c.employee_id),
      );

      const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const { data: existing, error: absError } = await supabase
        .from("absent_records")
        .select("employee_id")
        .eq("date", dateLabel)
        .in("employee_id", employeeIds);
      if (absError) throw absError;
      const alreadyRecordedIds = new Set((existing ?? []).map((r) => r.employee_id));

      return roster
        .filter((r) => !presentIds.has(r.id) && !alreadyRecordedIds.has(r.id))
        .map(
          (r) =>
            ({
              id: `inferred-${r.id}-${date}`,
              date: dateLabel,
              employeeId: r.id,
              employeeName: r.name,
              designation: r.role || "Unassigned",
              branch: r.branch,
              reason: "No check-in recorded",
              status: "Absent",
            }) satisfies AbsentRecord,
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

export type LeaveDecision = "Approved" | "Declined";

/**
 * Approve or decline a pending leave request. The row already exists in
 * absent_records (written by useApplyLeaveRequest with status 'Pending');
 * this only flips its status. Requires the UPDATE policy added in
 * supabase/attendance/09_leave_approval.sql — without it RLS rejects the
 * write silently.
 */
export function useDecideLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; decision: LeaveDecision }) => {
      const { data, error } = await supabase
        .from("absent_records")
        .update({ status: input.decision })
        .eq("id", input.id)
        .select("id");
      if (error) throw error;
      // RLS rejections return no error but update zero rows — surface that
      // instead of reporting a success that never happened.
      if (!data || data.length === 0) {
        throw new Error("Leave request could not be updated (no matching row or blocked by RLS).");
      }
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

/**
 * Real employees currently checked in today — their latest check-in/check-out
 * event today is a check-in with no matching check-out yet. Previously this
 * merged in the demo `live_tracking` table, but those rows are a static seed
 * hardcoded to currentStatus "Present" with no date attached, so they always
 * counted toward "Currently Present" regardless of the actual day — a
 * permanent, structural mismatch against the real, date-scoped "Employees
 * Present" KPI on the dashboard (useDashboardStats). Dropped entirely so this
 * page can't disagree with that number again. Real check-ins don't carry a
 * friendly cubicle-style location label or a temperature reading, so those
 * show as GPS coordinates and "—" respectively.
 */
export function useLiveTracking(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["attendance", "live-tracking", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<LiveTracking[]> => {
      let empQuery = supabase.from("employees").select("id, name, role, branch");
      if (!allBranches) empQuery = empQuery.eq("branch", branch);
      const { data: employees, error: empError } = await empQuery;
      if (empError) throw empError;
      const employeeIds = (employees ?? []).map((e) => e.id);
      if (employeeIds.length === 0) return [];

      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: checkins, error: chkError } = await supabase
        .from("employee_checkins")
        .select(
          "employee_id, check_type, check_time, latitude, longitude, geofence_verified, photo_url, status",
        )
        .eq("check_date", todayIso)
        .in("employee_id", employeeIds)
        .order("check_time", { ascending: true });
      if (chkError) throw chkError;

      // Latest event of the day per employee — still "in" only if that
      // event is a check-in (a later check-out means they've left).
      const lastEventByEmployee = new Map<string, (typeof checkins)[number]>();
      (checkins ?? [])
        .filter((c) => !c.status || c.status === "success")
        .forEach((c) => lastEventByEmployee.set(c.employee_id, c));

      let realRows: LiveTracking[] = (employees ?? []).flatMap((e) => {
        const last = lastEventByEmployee.get(e.id);
        if (!last || last.check_type !== "check-in") return [];
        const location =
          last.latitude != null && last.longitude != null
            ? `${last.latitude.toFixed(4)}, ${last.longitude.toFixed(4)}`
            : "—";
        return [
          {
            employeeId: e.id,
            employeeName: e.name,
            branch: e.branch,
            designation: e.role || "Unassigned",
            checkInTime: last.check_time,
            currentStatus: "Present",
            location,
            lastLocation: location,
            gpsVerified: !!last.geofence_verified,
            photoVerified: !!last.photo_url,
          } satisfies LiveTracking,
        ];
      });

      if (search) {
        const term = search.trim().toLowerCase();
        realRows = realRows.filter(
          (r) =>
            r.employeeName.toLowerCase().includes(term) ||
            r.location.toLowerCase().includes(term),
        );
      }

      return realRows;
    },
  });
}

export function useAttendanceReports(search?: string) {
  return useQuery({
    queryKey: ["attendance", "reports", search ?? ""],
    queryFn: async (): Promise<AttendanceReport[]> => {
      let query = supabase
        .from("attendance_reports")
        .select(
          "id, reportName:report_name, period, generatedOn:generated_on, format, status, branch",
        );
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

export function useCreateAttendanceReport(branch?: string) {
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
        branch: branch || null,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "reports"] });
    },
  });
}

export function useDeleteAttendanceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("attendance_reports")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      // RLS rejections return no error but delete zero rows — surface that
      // instead of reporting a success that never happened (run
      // supabase/attendance/11_reports_delete.sql to enable the policy).
      if (!data || data.length === 0) {
        throw new Error("Report could not be deleted (no matching row or blocked by RLS).");
      }
      return id;
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

export type ShiftConfigInput = Omit<ShiftConfig, "id">;

export function useCreateShiftConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShiftConfigInput) => {
      const { error } = await supabase.from("shift_configs").insert({
        shift_name: input.shiftName,
        start_time: input.startTime,
        end_time: input.endTime,
        grace_period_minutes: input.gracePeriodMinutes,
        geofence_radius: input.geofenceRadius,
        requires_gps: input.requiresGPS,
        requires_photo: input.requiresPhoto,
        applicable_days: input.applicableDays,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useDeleteShiftConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shift_configs").delete().eq("id", id);
      if (error) throw error;
      return id;
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
          "id, employeeId:employee_id, employeeName:employee_name, branch, checkDate:check_date, checkType:check_type, checkTime:check_time, latitude, longitude, geofenceVerified:geofence_verified, distanceFromOfficeM:distance_from_office_m, geofenceErrorMessage:geofence_error_message, status, notes, photoUrl:photo_url",
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

// Uploads a captured (already watermarked) check-in selfie to the
// attendance-photos storage bucket and returns its public URL. Thrown errors
// bubble up so the caller can abort the check-in rather than record it
// without the required proof-of-presence photo.
export async function uploadCheckinPhoto(
  blob: Blob,
  employeeId: string,
  checkType: "check-in" | "check-out",
): Promise<string> {
  const path = `${employeeId || "unknown"}/${Date.now()}-${checkType}.jpg`;
  const { error } = await supabase.storage
    .from("attendance-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("attendance-photos").getPublicUrl(path);
  return data.publicUrl;
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
      photoUrl?: string;
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
        photo_url: input.photoUrl,
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
