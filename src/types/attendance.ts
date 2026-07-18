export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave" | "Holiday";
export type CheckType = "Check-In" | "Check-Out";
export type LeaveType = "Sick" | "Personal" | "Casual" | "Paid" | "Unpaid";

export interface DailyLog {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  checkInTime: string;
  checkOutTime: string;
  status: AttendanceStatus;
  branch: string;
  location?: string;
  notes?: string;
}

export interface EmployeeAttendance {
  employeeId: string;
  employeeName: string;
  designation: string;
  branch: string;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  attendancePercentage: string;
  lastCheckIn?: string;
}

export interface LateArrival {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  checkInTime: string;
  latenessMinutes: number;
  branch: string;
  status: string;
}

export interface AbsentRecord {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  branch: string;
  leaveType?: LeaveType;
  reason?: string;
  status: string;
}

export interface LiveTracking {
  employeeId: string;
  employeeName: string;
  branch: string;
  designation: string;
  checkInTime: string;
  currentStatus: string;
  location: string;
  temperature?: string;
  lastLocation?: string;
  gpsVerified: boolean;
  photoVerified: boolean;
}

export interface AttendanceReport {
  id: string;
  reportName: string;
  period: string;
  generatedOn: string;
  format: "PDF" | "Excel";
  status: "Ready" | "Pending";
  branch?: string;
}

export interface AttendanceSetting {
  id: string;
  name: string;
  type: string;
  value: string;
  description?: string;
}

export interface ShiftConfig {
  id: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  geofenceRadius: number;
  requiresGPS: boolean;
  requiresPhoto: boolean;
  applicableDays: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  averageAttendance: string;
  onLeave: number;
}

export interface AttendanceDashboard {
  stats: AttendanceStats;
  recentLateArrivals: LateArrival[];
  departmentAttendance: Array<{ department: string; percentage: string }>;
}

export interface CheckInLog {
  employeeId: string;
  checkTime: string;
  checkType: CheckType;
  location: string;
  temperature?: string;
  photoUrl?: string;
  gpsCoordinates?: string;
  notes?: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  branch: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address?: string;
}

export interface EmployeeCheckin {
  id: string;
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
}

export interface EmployeeMonthlySummary {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  year: number;
  month: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendancePercentage: string;
}
