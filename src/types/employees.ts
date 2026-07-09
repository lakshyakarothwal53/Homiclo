export type EmployeeStatus = "Active" | "Inactive" | "Suspended";
export type EmployeeRole = "Cashier" | "Floor Manager" | "Inventory" | "Supervisor" | "Admin";
export type LoginStatus = "online" | "idle" | "offline";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  branch: string;
  joinDate: string;
  status: EmployeeStatus;
  salary: string;
  password?: string;
}

export interface EmployeeLogin {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  branch: string;
  loginTime: string;
  logoutTime: string;
  duration: string;
  status: LoginStatus;
  lastSeen: string;
}

export interface EmployeeActivity {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  activity: string;
  timestamp: string;
  details: string;
}

export interface EmployeeLocation {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: string;
  accuracy: string;
}

export interface EmployeeReport {
  id: string;
  report: string;
  period: string;
  generated: string;
  status: string;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  branch: string;
  joinDate: string;
  salary: string;
  status: EmployeeStatus;
  address: string;
  emergencyContact: string;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  attendanceRate: string;
}
