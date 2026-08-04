import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgePercent,
  Box,
  CircleDollarSign,
  Clock,
  IndianRupee,
  Plus,
  Receipt,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useDashboardStats,
  useSalesChartData,
  useAttendanceChartData,
  useInventoryMixData,
  useRecentTransactions,
  useStockAlertsData,
  useEmployeeLogins,
} from "@/hooks/use-dashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessPath, canManageCatalogue, isBranchScoped } from "@/lib/roles";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — HOMIQLO Super Admin" },
      {
        name: "description",
        content: "HOMIQLO Super Admin overview of sales, attendance, inventory and operations.",
      },
    ],
  }),
  component: DashboardPage,
});

const pieColors = ["#FE0000", "#000000", "#6B7280", "#F59E0B", "#2563EB"];

function statusDot(s: string) {
  if (s === "online") return "bg-[color:var(--success)]";
  if (s === "idle") return "bg-[color:var(--warning)]";
  return "bg-muted-foreground/40";
}

function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Super Admin sees the whole company (branch = undefined → global tables);
  // every branch-scoped role sees only their own branch's data.
  const branch = user && isBranchScoped(user.role) ? user.branch : undefined;

  // Quick actions are filtered to what this role can actually open, so a
  // cashier isn't offered tiles that the route guard would bounce them from.
  // "Mark Attendance" leads the list for self-service roles — it's the action
  // they start their shift with.
  const quickActions = useMemo(() => {
    const all = [
      { icon: Clock, label: "Mark Attendance", route: "/attendance/employee-checkin" },
      { icon: UserPlus, label: "Add Employee", route: "/employees/add" },
      // Only Super Admin can create products; a branch receives stock from the
      // centre, so its tile links to the read-only list instead.
      user && canManageCatalogue(user.role)
        ? { icon: Box, label: "Add Product", route: "/inventory/products" }
        : { icon: Box, label: "View Inventory", route: "/inventory/products" },
      { icon: Receipt, label: "New Invoice", route: "/billing/create-invoice" },
      { icon: BadgePercent, label: "New Discount", route: "/discounts" },
      { icon: ShoppingCart, label: "Open POS", route: "/pos" },
      { icon: ShieldCheck, label: "Audit Log", route: "/settings/roles" },
    ];
    if (!user) return all;
    return all.filter((a) => canAccessPath(user.role, a.route));
  }, [user]);

  // Fetch all dashboard data from Supabase, scoped to the viewer's branch.
  const statsQuery = useDashboardStats(branch);
  const salesChartQuery = useSalesChartData(branch);
  const attendanceChartQuery = useAttendanceChartData(branch);
  const inventoryMixQuery = useInventoryMixData(branch);
  const transactionsQuery = useRecentTransactions(branch);
  const stockAlertsQuery = useStockAlertsData(branch);
  const loginsQuery = useEmployeeLogins(branch);

  // Live data only — while loading (or on error) widgets show placeholders/empty
  // states, never mock rows.
  const stats = statsQuery.data;
  const salesData = salesChartQuery.data ?? [];
  const attendanceData = attendanceChartQuery.data ?? [];
  const inventoryMix = inventoryMixQuery.data ?? [];
  const recentTx = transactionsQuery.data ?? [];
  const stockAlerts = stockAlertsQuery.data ?? [];
  const loginStatus = loginsQuery.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Good morning, ${user?.role === "super_admin" ? "Super Admin" : user?.name?.split(" ")[0] ?? "there"}`}
        description={
          branch
            ? `Here's what's happening at ${branch} today.`
            : "Here's what's happening across all HOMIQLO branches today."
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.navigate({ to: "/pos" })}
            >
              <ScanLine className="h-4 w-4" /> Open POS
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => router.navigate({ to: "/billing/create-invoice" })}
            >
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales Today"
          value={stats?.todaysSales ?? "—"}
          delta={stats?.todaysSalesDelta}
          icon={IndianRupee}
        />
        <StatCard
          label="Employees Present"
          value={stats?.employeesPresent ?? "—"}
          delta={stats?.employeesAttendanceHint}
          icon={Users}
        />
        <StatCard
          label="Stock Alerts"
          value={stats ? stats.stockAlerts.toString() : "—"}
          delta={stats?.stockAlertsDelta}
          trend="down"
          icon={AlertTriangle}
        />
        <StatCard
          label="Active Discounts"
          value={stats ? stats.activeDiscounts.toString() : "—"}
          hint={stats?.activeDiscountsHint}
          icon={BadgePercent}
        />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Sales overview</CardTitle>
              <p className="text-xs text-muted-foreground">Last 7 days · Sales vs Revenue</p>
            </div>
            <Badge variant="secondary" className="gap-1 bg-secondary">
              <ArrowUpRight className="h-3 w-3 text-brand" />
              {`₹${salesData.reduce((s, d) => s + d.sales, 0).toLocaleString("en-IN")} this week`}
            </Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FE0000" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FE0000" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#000000" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#000000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="d"
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#FE0000"
                  strokeWidth={2}
                  fill="url(#g-sales)"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#000000"
                  strokeWidth={2}
                  fill="url(#g-rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inventory mix</CardTitle>
            <p className="text-xs text-muted-foreground">By category share</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryMix}
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {inventoryMix.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance overview</CardTitle>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="d"
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Bar dataKey="present" stackId="a" fill="#000000" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" stackId="a" fill="#F59E0B" />
                <Bar dataKey="absent" stackId="a" fill="#FE0000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {quickActions.map(({ icon: Icon, label, route }) => (
              <button
                key={label}
                onClick={() => router.navigate({ to: route })}
                className="group flex flex-col items-start gap-2 rounded-md border border-border bg-card p-3 text-left transition hover:border-brand hover:bg-secondary cursor-pointer"
              >
                <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-foreground group-hover:bg-brand group-hover:text-brand-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: transactions + alerts + logins */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Recent transactions</CardTitle>
              <p className="text-xs text-muted-foreground">Last 5 sales</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-brand hover:text-brand"
              onClick={() => router.navigate({ to: "/billing" })}
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2 text-left font-medium">Invoice</th>
                    <th className="px-5 py-2 text-left font-medium">Customer</th>
                    <th className="px-5 py-2 text-left font-medium">Method</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
                    <th className="px-5 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.length === 0 && (
                    <tr className="border-t border-border">
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        {transactionsQuery.isLoading
                          ? "Loading transactions…"
                          : "No transactions yet."}
                      </td>
                    </tr>
                  )}
                  {recentTx.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-5 py-3 font-mono text-xs">{t.id}</td>
                      <td className="px-5 py-3">{t.customer}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.method}</td>
                      <td className="px-5 py-3 text-right font-medium">{t.amount}</td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="secondary"
                          className={
                            t.status === "Paid"
                              ? "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]"
                              : t.status === "Pending"
                                ? "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning)]"
                                : "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand"
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-brand" /> Stock alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockAlerts.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {stockAlertsQuery.isLoading ? "Loading alerts…" : "No stock alerts."}
                </p>
              )}
              {stockAlerts.map((s) => (
                <div key={s.sku} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{s.sku}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-brand">{s.left} left</div>
                    <div className="text-[11px] text-muted-foreground">re-order @ {s.reorder}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Employee logins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loginStatus.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {loginsQuery.isLoading ? "Loading logins…" : "No recent logins."}
                </p>
              )}
              {loginStatus.map((u) => (
                <div key={u.name} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {u.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${statusDot(u.status)}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{u.role}</div>
                  </div>
                  <CircleDollarSign className="hidden h-4 w-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
