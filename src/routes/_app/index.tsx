import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — HOMIQLO Super Admin" },
      { name: "description", content: "HOMIQLO Super Admin overview of sales, attendance, inventory and operations." },
    ],
  }),
  component: DashboardPage,
});

const salesData = [
  { d: "Mon", sales: 42000, revenue: 31000 },
  { d: "Tue", sales: 51000, revenue: 38000 },
  { d: "Wed", sales: 47000, revenue: 34500 },
  { d: "Thu", sales: 62000, revenue: 46000 },
  { d: "Fri", sales: 71000, revenue: 53000 },
  { d: "Sat", sales: 89000, revenue: 67000 },
  { d: "Sun", sales: 76000, revenue: 58000 },
];

const attendanceData = [
  { d: "Mon", present: 124, late: 8, absent: 6 },
  { d: "Tue", present: 131, late: 5, absent: 4 },
  { d: "Wed", present: 128, late: 9, absent: 7 },
  { d: "Thu", present: 134, late: 4, absent: 3 },
  { d: "Fri", present: 119, late: 12, absent: 9 },
  { d: "Sat", present: 96, late: 6, absent: 14 },
  { d: "Sun", present: 58, late: 2, absent: 22 },
];

const inventoryMix = [
  { name: "Furniture", value: 38 },
  { name: "Decor", value: 24 },
  { name: "Lighting", value: 18 },
  { name: "Kitchen", value: 12 },
  { name: "Other", value: 8 },
];
const pieColors = ["#FE0000", "#000000", "#6B7280", "#F59E0B", "#2563EB"];

const recentTx = [
  { id: "INV-20481", customer: "Riya Sharma", amount: "₹ 12,480", method: "UPI", status: "Paid" },
  { id: "INV-20480", customer: "Karan Mehta", amount: "₹  4,250", method: "Card", status: "Paid" },
  { id: "INV-20479", customer: "Anaya Iyer", amount: "₹ 28,900", method: "Cash", status: "Pending" },
  { id: "INV-20478", customer: "Vikram Rao", amount: "₹  9,120", method: "UPI", status: "Paid" },
  { id: "INV-20477", customer: "Meera Joshi", amount: "₹  1,990", method: "Card", status: "Refunded" },
];

const stockAlerts = [
  { sku: "HMQ-CHR-204", name: "Walnut Lounge Chair", left: 3, reorder: 10 },
  { sku: "HMQ-LMP-012", name: "Arc Floor Lamp", left: 5, reorder: 15 },
  { sku: "HMQ-DEC-118", name: "Ceramic Vase Set", left: 2, reorder: 20 },
  { sku: "HMQ-KIT-077", name: "Cast Iron Skillet", left: 7, reorder: 25 },
];

const loginStatus = [
  { name: "Priya Nair", role: "Cashier · Bandra", status: "online" },
  { name: "Arjun Kapoor", role: "Floor Manager · Andheri", status: "online" },
  { name: "Neha Singh", role: "Inventory · Powai", status: "idle" },
  { name: "Rohan Das", role: "Cashier · Worli", status: "offline" },
  { name: "Sara Khan", role: "Cashier · Bandra", status: "online" },
];

function statusDot(s: string) {
  if (s === "online") return "bg-[color:var(--success)]";
  if (s === "idle") return "bg-[color:var(--warning)]";
  return "bg-muted-foreground/40";
}

function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Good morning, Aarav"
        description="Here's what's happening across HOMIQLO today."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <ScanLine className="h-4 w-4" /> Open POS
            </Button>
            <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales Today" value="₹ 4,38,210" delta="+12.4% vs yesterday" icon={IndianRupee} />
        <StatCard label="Employees Present" value="128 / 142" delta="90.1% attendance" icon={Users} />
        <StatCard label="Stock Alerts" value="14" delta="-3 since last week" trend="down" icon={AlertTriangle} />
        <StatCard label="Active Discounts" value="9" hint="3 campaigns expiring this week" icon={BadgePercent} />
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
              <ArrowUpRight className="h-3 w-3 text-brand" /> 18.2%
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
                <XAxis dataKey="d" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="sales" stroke="#FE0000" strokeWidth={2} fill="url(#g-sales)" />
                <Area type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={2} fill="url(#g-rev)" />
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
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
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
                <XAxis dataKey="d" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
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
            {[
              { icon: UserPlus, label: "Add Employee" },
              { icon: Box, label: "Add Product" },
              { icon: Receipt, label: "New Invoice" },
              { icon: BadgePercent, label: "New Discount" },
              { icon: ShoppingCart, label: "Open POS" },
              { icon: ShieldCheck, label: "Audit Log" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="group flex flex-col items-start gap-2 rounded-md border border-border bg-card p-3 text-left transition hover:border-brand hover:bg-secondary"
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
            <Button variant="ghost" size="sm" className="gap-1 text-brand hover:text-brand">
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
              {loginStatus.map((u) => (
                <div key={u.name} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {u.name.split(" ").map((n) => n[0]).join("")}
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