import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IndianRupee, Clock, BarChart3, RotateCcw, Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/billing/")({
  head: () => ({
    meta: [
      { title: "Billing Dashboard — HOMIQLO" },
      { name: "description", content: "Revenue, payments and reconciliation overview." },
    ],
  }),
  component: Page,
});

const revenueTrend = [
  { d: "1 Nov", revenue: 64000 },
  { d: "2 Nov", revenue: 72000 },
  { d: "3 Nov", revenue: 81000 },
  { d: "4 Nov", revenue: 94000 },
  { d: "5 Nov", revenue: 108000 },
  { d: "6 Nov", revenue: 121000 },
  { d: "7 Nov", revenue: 134000 },
  { d: "8 Nov", revenue: 58000 },
  { d: "9 Nov", revenue: 69000 },
  { d: "10 Nov", revenue: 88000 },
  { d: "11 Nov", revenue: 112000 },
  { d: "12 Nov", revenue: 124580 },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Billing › Dashboard"
        title="Billing Dashboard"
        description="Dashboard overview and controls."
        actions={
          <Button
            asChild
            size="sm"
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Link to="/billing/create-invoice">
              <Plus className="h-4 w-4" /> Create Invoice
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Revenue" value="₹1,24,580" hint="48 invoices" icon={IndianRupee} />
        <StatCard label="Pending Payments" value="₹38,200" hint="12 invoices" icon={Clock} />
        <StatCard label="This Month" value="₹24.8L" delta="Up 18% vs last month" icon={BarChart3} />
        <StatCard label="Refunds" value="₹4,820" hint="6 this week" icon={RotateCcw} />
      </div>

      <Card className="mt-6 border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Revenue Trend</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-brand hover:text-brand">
            <Link to="/billing/reports">
              <FileText className="h-3.5 w-3.5" /> Reports
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTrend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="g-bill-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FE0000" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#FE0000" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="d" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, #FE0000 8%, transparent)" }}
                formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
              />
              <Bar
                dataKey="revenue"
                fill="url(#g-bill-rev)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
