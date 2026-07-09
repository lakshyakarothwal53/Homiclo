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
import {
  useInventoryDashboard,
  useProducts,
  useLowStockAlerts,
  useCategories,
  useStockInward,
  useStockOutward,
} from "@/hooks/use-inventory";

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
  const { data: dashboardData, isLoading: dashboardLoading } = useInventoryDashboard();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: lowStockAlerts = [], isLoading: alertsLoading } = useLowStockAlerts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: stockInward = [], isLoading: inwardLoading } = useStockInward();
  const { data: stockOutward = [], isLoading: outwardLoading } = useStockOutward();

  // Calculate real stats from Supabase data
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStockCount = lowStockAlerts.length;

  // Calculate total stock value (price × stock for each product)
  const totalStockValue = products.reduce((sum, p) => {
    return sum + (p.price || 0) * (p.stock || 0);
  }, 0);

  // Calculate stock movement for last 30 days from inward/outward data
  const generateStockMovement = () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        d: String(date.getDate()),
        inward: 0,
        outward: 0,
      };
    });

    // Aggregate inward quantities by day
    stockInward.forEach((item) => {
      const dayMatch = days.find((d) => d.d === (item.date ? String(parseInt(item.date)) : ""));
      if (dayMatch) dayMatch.inward += item.qty || 0;
    });

    // Aggregate outward quantities by day
    stockOutward.forEach((item) => {
      const dayMatch = days.find((d) => d.d === (item.date ? String(parseInt(item.date)) : ""));
      if (dayMatch) dayMatch.outward += item.qty || 0;
    });

    return days;
  };

  // Format stock value in Indian Rupees (L = Lakhs, 1L = 100,000)
  const formatStockValue = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value}`;
  };

  const stockMovement = generateStockMovement();
  const isLoading =
    dashboardLoading ||
    productsLoading ||
    alertsLoading ||
    categoriesLoading ||
    inwardLoading ||
    outwardLoading;

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Inventory Dashboard"
        description="Dashboard overview and controls."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Products"
          value={isLoading ? "—" : totalProducts.toLocaleString("en-IN")}
          hint={isLoading ? undefined : `Across ${totalCategories} categories`}
          icon={Boxes}
        />
        <StatCard
          label="Total Categories"
          value={isLoading ? "—" : String(totalCategories)}
          hint={isLoading ? undefined : `${categories.length} active`}
          icon={Boxes}
        />
        <StatCard
          label="Stock Value"
          value={isLoading ? "—" : formatStockValue(totalStockValue)}
          hint="Current inventory"
          icon={IndianRupee}
        />
        <StatCard
          label="Low Stock"
          value={isLoading ? "—" : String(lowStockCount)}
          hint="Reorder required"
          icon={AlertTriangle}
        />
        <StatCard
          label="Out of Stock"
          value={isLoading ? "—" : String(outOfStock)}
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
            {inwardLoading || outwardLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockMovement} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
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
            <CardTitle className="text-base">All Categories</CardTitle>
            <p className="text-xs text-muted-foreground">Product count and share by category</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Category</th>
                    <th className="px-4 py-2 text-right font-medium">Products</th>
                    <th className="px-4 py-2 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesLoading
                    ? Array.from({ length: 9 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={3}>
                            <Skeleton className="h-8 w-full" />
                          </td>
                        </tr>
                      ))
                    : (() => {
                        const totalCategoryProducts = categories.reduce(
                          (sum, c) => sum + (c.productCount || 0),
                          0,
                        );
                        return categories
                          .sort((a, b) => (b.productCount || 0) - (a.productCount || 0))
                          .map((c) => {
                            const share =
                              totalCategoryProducts > 0
                                ? Math.round(((c.productCount || 0) / totalCategoryProducts) * 100)
                                : 0;
                            return (
                              <tr
                                key={c.name}
                                className="border-t border-border hover:bg-secondary/30"
                              >
                                <td className="px-4 py-3 font-medium">{c.name}</td>
                                <td className="px-4 py-3 text-right text-muted-foreground">
                                  {c.productCount}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                                    {share}%
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                      })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
