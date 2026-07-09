import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEmployeeProfile } from "@/hooks/use-employees";
import { useEmployeeMonthlySummary } from "@/hooks/use-attendance";
import { Mail, Phone, Briefcase, MapPin, Calendar, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_app/employees/profile-detail")({
  head: () => ({
    meta: [
      { title: "My Profile — HOMIQLO" },
      {
        name: "description",
        content: "Your employee profile and attendance summary.",
      },
    ],
  }),
  component: ProfileDetailPage,
});

function ProfileDetailPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useEmployeeProfile(user?.id);
  const { data: monthlySummary } = useEmployeeMonthlySummary(user?.id);

  if (isProfileLoading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEES › My Profile"
        title="Your Profile"
        description={`Employee ID: ${user?.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="text-lg font-semibold">{profile?.name}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg font-semibold">{profile?.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-lg font-semibold">{profile?.phone}</p>
                  </div>
                </div>

                {/* Branch */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="text-lg font-semibold">{profile?.branch}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="text-lg font-semibold">{profile?.role}</p>
                  </div>
                </div>

                {/* Join Date */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Join Date</p>
                    <p className="text-lg font-semibold">{profile?.joinDate}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Monthly Salary</p>
                <p className="text-3xl font-bold text-brand">{profile?.salary}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Summary Sidebar */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                This Month's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthlySummary ? (
                <>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                      Attendance Rate
                    </p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {monthlySummary.attendancePercentage}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-600 dark:text-green-300 font-medium">
                        Working Days
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                        {monthlySummary.workingDays}
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                        Present
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                        {monthlySummary.presentDays}
                      </p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-600 dark:text-red-300 font-medium">
                        Absent
                      </p>
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
                  <p className="text-sm">No attendance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
