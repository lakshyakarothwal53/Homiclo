import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, IndianRupee, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryDashboard } from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory Dashboard — HOMIQLO" },
      { name: "description", content: "Stock levels across categories." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data, isLoading } = useInventoryDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Inventory Dashboard"
        description="Dashboard overview and controls."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products"
          value={data ? data.stats.totalProducts.toLocaleString("en-IN") : "—"}
          hint={data ? `Across ${data.stats.totalCategories} categories` : undefined}
          icon={Boxes}
        />
        <StatCard
          label="Stock Value"
          value={data ? data.stats.stockValue : "—"}
          hint="Current inventory"
          icon={IndianRupee}
        />
        <StatCard
          label="Low Stock"
          value={data ? String(data.stats.lowStock) : "—"}
          hint="Reorder required"
          icon={AlertTriangle}
        />
        <StatCard
          label="Out of Stock"
          value={data ? String(data.stats.outOfStock) : "—"}
          hint="Critical items"
          icon={XCircle}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock Movement (30 days)</CardTitle>
            <p className="text-xs text-muted-foreground">Inward vs Outward units</p>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading || !data ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.stockMovement}
                  margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
                >
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
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inward" name="Inward" fill="#000000" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outward" name="Outward" fill="#FE0000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Categories</CardTitle>
            <p className="text-xs text-muted-foreground">By product share</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
              : data.topCategories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.productCount} products
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      {c.share}%
                    </span>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
