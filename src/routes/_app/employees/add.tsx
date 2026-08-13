import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useCreateEmployee } from "@/hooks/use-employees";
import { useBranches } from "@/hooks/use-inventory";
import { useShiftConfigs } from "@/hooks/use-attendance";
import { useRoles } from "@/hooks/use-settings";
import { ROLE_LABEL } from "@/lib/roles";
import type { EmployeeRole, EmployeeStatus } from "@/types/employees";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/employees/add")({
  head: () => ({
    meta: [
      { title: "Add Employee — HOMIQLO" },
      { name: "description", content: "Onboard a new team member." },
    ],
  }),
  component: AddEmployeePage,
});

function AddEmployeePage() {
  const router = useRouter();
  const { mutate: createEmployee, isPending } = useCreateEmployee();
  const { data: branches = [] } = useBranches();
  const { data: shifts = [] } = useShiftConfigs();
  // Super Admin is a system access level held by a single reserved account,
  // not an assignable job position — exclude it from onboarding.
  const { data: roles = [] } = useRoles();
  const assignableRoles = roles.filter((r) => r.role !== "Super Admin");
  const { scoped, homeBranch } = useBranchScope();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    branch: scoped ? homeBranch : "",
    joinDate: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    status: "Active",
    salary: "",
    password: "",
    confirmPassword: "",
    shiftId: "",
    address: "",
    emergencyContact: "",
  });

  const selectedRole = assignableRoles.find((r) => r.role === formData.role);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.branch) newErrors.branch = "Branch is required";
    if (!formData.shiftId) newErrors.shiftId = "Shift is required";
    if (!formData.salary.trim()) newErrors.salary = "Salary is required";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createEmployee(
      {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role as EmployeeRole,
        branch: formData.branch,
        joinDate: formData.joinDate,
        status: formData.status as EmployeeStatus,
        salary: formData.salary,
        password: formData.password,
        shiftId: formData.shiftId,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
      },
      {
        onSuccess: () => {
          toast.success("Employee added successfully");
          router.navigate({ to: "/employees" });
        },
        onError: (error) => {
          toast.error(`Failed to add employee: ${error.message}`);
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES"
        title="Add Employee"
        description="Onboard a new team member."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => router.navigate({ to: "/employees" })}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <Card className="border-border max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Street, city, state"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  placeholder="Name & phone number"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary *</Label>
                <Input
                  id="salary"
                  placeholder="₹ 2,50,000"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className={errors.salary ? "border-red-500" : ""}
                />
                {errors.salary && <p className="text-xs text-red-500">{errors.salary}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.role} value={r.role}>
                        {r.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
                {selectedRole && (
                  <p className="text-xs text-muted-foreground">
                    Signs in on the {ROLE_LABEL[selectedRole.loginAs]} login only.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Select
                  value={formData.branch}
                  onValueChange={(value) => setFormData({ ...formData, branch: value })}
                  disabled={scoped}
                >
                  <SelectTrigger className={errors.branch ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(scoped ? [homeBranch] : branches).map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branch && <p className="text-xs text-red-500">{errors.branch}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Shift *</Label>
                <Select
                  value={formData.shiftId}
                  onValueChange={(value) => setFormData({ ...formData, shiftId: value })}
                >
                  <SelectTrigger className={errors.shiftId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.shiftName} ({shift.startTime} - {shift.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.shiftId && <p className="text-xs text-red-500">{errors.shiftId}</p>}
                <p className="text-xs text-muted-foreground">
                  The employee can only mark check-in / check-out during this shift's window.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="submit"
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={isPending}
              >
                {isPending ? "Adding..." : "Add Employee"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.navigate({ to: "/employees" })}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
