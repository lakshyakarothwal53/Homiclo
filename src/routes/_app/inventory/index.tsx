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
  useProducts,
  useLowStockAlerts,
  useCategories,
  useStockInward,
  useStockOutward,
  useBranchAllocationMovement,
} from "@/hooks/use-inventory";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { parseRowDate } from "@/lib/report-data";

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
  // Branch-scoped roles see only their own branch's allocated inventory;
  // Super Admin ("all") sees the central catalogue.
  const { scoped, homeBranch } = useBranchScope();
  const branch = scoped ? homeBranch : undefined;

  // The inventory_dashboard table is a seed-time JSON snapshot that goes stale
  // the moment stock moves, and every figure below is computed live instead —
  // so it is deliberately not queried here.
  const { data: products = [], isLoading: productsLoading } = useProducts(undefined, branch);
  const { data: lowStockAlerts = [], isLoading: alertsLoading } = useLowStockAlerts(
    undefined,
    branch,
  );
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(undefined, branch);
  const { data: stockInward = [], isLoading: inwardLoading } = useStockInward(undefined, branch);
  const { data: stockOutward = [], isLoading: outwardLoading } = useStockOutward(undefined, branch);
  const { data: allocationMovement = [] } = useBranchAllocationMovement(branch);

  // Calculate real stats from Supabase data
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStockCount = lowStockAlerts.length;

  // Calculate total stock value (price × stock for each product)
  const totalStockValue = products.reduce((sum, p) => {
    return sum + (p.price || 0) * (p.stock || 0);
  }, 0);

  // Stock movement chart, built from whichever dates actually have inward or
  // outward records — not a fixed trailing-30-calendar-days window. A fixed
  // window matched by day-of-month alone (the previous implementation) wrongly
  // merged records from different months onto the same bar; matching by exact
  // date instead would correctly show nothing whenever the recorded dates
  // fall outside the last 30 real days, which is common for demo/seed data.
  // Plotting the actual last-30 movement dates always reflects real records.
  const isoOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shortLabel = (d: Date) => `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;

  const generateStockMovement = () => {
    const byDate = new Map<string, { date: Date; inward: number; outward: number }>();

    const record = (rawDate: string | undefined, qty: number, key: "inward" | "outward") => {
      const parsed = rawDate ? parseRowDate(rawDate) : null;
      if (!parsed) return;
      const iso = isoOf(parsed);
      if (!byDate.has(iso)) byDate.set(iso, { date: parsed, inward: 0, outward: 0 });
      byDate.get(iso)![key] += qty || 0;
    };

    stockInward.forEach((item) => record(item.date, item.qty, "inward"));
    stockOutward.forEach((item) => record(item.date, item.qty, "outward"));
    // Branch view: stock arriving from the centre counts as inward for that
    // branch, a recall as outward.
    allocationMovement.forEach((a) => {
      record(a.date, a.inward, "inward");
      record(a.date, a.outward, "outward");
    });

    return [...byDate.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-30)
      .map((row) => ({ d: shortLabel(row.date), inward: row.inward, outward: row.outward }));
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
    productsLoading || alertsLoading || categoriesLoading || inwardLoading || outwardLoading;

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Inventory Dashboard"
        description={
          branch ? `Stock allocated to ${branch}.` : "Central catalogue across all branches."
        }
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
          hint={branch ? `Held at ${branch}` : "Central inventory"}
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
            <CardTitle className="text-base">Stock Movement</CardTitle>
            <p className="text-xs text-muted-foreground">
              Inward vs Outward units · last {Math.min(stockMovement.length, 30)} recorded dates
            </p>
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
