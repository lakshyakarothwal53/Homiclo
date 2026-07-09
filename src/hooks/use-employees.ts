import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Employee,
  EmployeeLogin,
  EmployeeActivity,
  EmployeeLocation,
  EmployeeReport,
  EmployeeProfile,
} from "@/types/employees";

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
        .select("id, name, email, phone, role, branch, joinDate:join_date, status, salary");
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

export function useEmployeeProfile(employeeId?: string) {
  return useQuery({
    queryKey: ["employees", "profile", employeeId ?? ""],
    queryFn: async (): Promise<EmployeeProfile | null> => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email, phone, role, branch, joinDate:join_date, salary, status")
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      return {
        ...data,
        address: "Not set",
        emergencyContact: "Not set",
        daysPresent: 18,
        daysAbsent: 2,
        daysLate: 3,
        attendanceRate: "90%",
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

export function useEmployeeActivity(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["employees", "activity", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<EmployeeActivity[]> => {
      let query = supabase
        .from("employee_activity")
        .select(
          "id, employeeId:employee_id, employeeName:employee_name, branch, activity, timestamp, details",
        );
      if (!allBranches) query = query.eq("branch", branch);
      if (search)
        query = query.or(`employee_name.ilike.${like(search)},activity.ilike.${like(search)}`);
      const { data, error } = await query.order("timestamp", { ascending: false });
      if (error) throw error;
      return data as unknown as EmployeeActivity[];
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

async function hashPassword(password: string): Promise<string> {
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
