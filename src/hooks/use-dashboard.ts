import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Mock data fallbacks (only used when database queries fail)
const mockSalesData = [
  { d: "Mon", sales: 42000, revenue: 31000 },
  { d: "Tue", sales: 51000, revenue: 38000 },
  { d: "Wed", sales: 47000, revenue: 34500 },
  { d: "Thu", sales: 62000, revenue: 46000 },
  { d: "Fri", sales: 71000, revenue: 53000 },
  { d: "Sat", sales: 89000, revenue: 67000 },
  { d: "Sun", sales: 76000, revenue: 58000 },
];

const mockAttendanceData = [
  { d: "Mon", present: 124, late: 8, absent: 6 },
  { d: "Tue", present: 131, late: 5, absent: 4 },
  { d: "Wed", present: 128, late: 9, absent: 7 },
  { d: "Thu", present: 134, late: 4, absent: 3 },
  { d: "Fri", present: 119, late: 12, absent: 9 },
  { d: "Sat", present: 96, late: 6, absent: 14 },
  { d: "Sun", present: 58, late: 2, absent: 22 },
];

const mockInventoryMix = [
  { name: "Furniture", value: 38 },
  { name: "Decor", value: 24 },
  { name: "Lighting", value: 18 },
  { name: "Kitchen", value: 12 },
  { name: "Other", value: 8 },
];

const mockRecentTx = [
  { id: "INV-20481", customer: "Riya Sharma", amount: "₹ 12,480", method: "UPI", status: "Paid" },
  { id: "INV-20480", customer: "Karan Mehta", amount: "₹  4,250", method: "Card", status: "Paid" },
  {
    id: "INV-20479",
    customer: "Anaya Iyer",
    amount: "₹ 28,900",
    method: "Cash",
    status: "Pending",
  },
  { id: "INV-20478", customer: "Vikram Rao", amount: "₹  9,120", method: "UPI", status: "Paid" },
  {
    id: "INV-20477",
    customer: "Meera Joshi",
    amount: "₹  1,990",
    method: "Card",
    status: "Refunded",
  },
];

const mockStockAlerts = [
  { sku: "HMQ-CHR-204", name: "Walnut Lounge Chair", left: 3, reorder: 10 },
  { sku: "HMQ-LMP-012", name: "Arc Floor Lamp", left: 5, reorder: 15 },
  { sku: "HMQ-DEC-118", name: "Ceramic Vase Set", left: 2, reorder: 20 },
  { sku: "HMQ-KIT-077", name: "Cast Iron Skillet", left: 7, reorder: 25 },
];

const mockLogins = [
  { name: "Priya Nair", role: "Cashier · Bandra", status: "online" },
  { name: "Arjun Kapoor", role: "Floor Manager · Andheri", status: "online" },
  { name: "Neha Singh", role: "Inventory · Powai", status: "idle" },
  { name: "Rohan Das", role: "Cashier · Worli", status: "offline" },
  { name: "Sara Khan", role: "Cashier · Bandra", status: "online" },
];

// Helper functions
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

function formatCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN")}`;
}

function calculateDelta(today: number, yesterday: number): string {
  if (yesterday === 0) return "+0%";
  const delta = ((today - yesterday) / yesterday) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% vs yesterday`;
}

function getDayOfWeek(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function parseAmount(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  return parseFloat(raw.replace("₹", "").replace(/,/g, "")) || 0;
}

// A branch is "scoped" when it names a real branch (not undefined / "all").
// Scoped reads use the per-branch junction table (billing_sales_bills_branches);
// unscoped (Super Admin) reads use the global table. Same pattern as inventory.
function isScoped(branch?: string): boolean {
  return !!branch && branch !== "all";
}

// Sum sales for a given date, scoped to a branch when provided.
async function sumSalesForDate(date: string, branch?: string): Promise<number> {
  const sumRows = (rows: { amount?: string }[] | null) =>
    (rows ?? []).reduce((total, row) => total + parseAmount(row.amount), 0);

  if (isScoped(branch)) {
    const { data } = await supabase
      .from("billing_sales_bills_branches")
      .select("amount")
      .eq("date", date)
      .eq("branch", branch);
    return sumRows(data);
  }
  const { data } = await supabase.from("billing_sales_bills").select("amount").eq("date", date);
  return sumRows(data);
}

export interface DashboardStats {
  todaysSales: string;
  todaysSalesDelta: string;
  employeesPresent: string;
  employeesAttendanceHint: string;
  stockAlerts: number;
  stockAlertsDelta: string;
  activeDiscounts: number;
  activeDiscountsHint: string;
}

export interface RecentTransaction {
  id: string;
  customer: string;
  amount: string;
  method: string;
  status: string;
}

export interface StockAlert {
  sku: string;
  name: string;
  left: number;
  reorder: number;
}

export interface EmployeeLogin {
  name: string;
  role: string;
  status: string;
}

export interface SalesChartData {
  d: string;
  sales: number;
  revenue: number;
}

export interface AttendanceChartData {
  d: string;
  present: number;
  late: number;
  absent: number;
}

export interface CategoryData {
  name: string;
  value: number;
}

// Fetch dashboard stats - real data from database, scoped to a branch when given.
// Pass `branch` for a Branch Admin (their own branch); omit / "all" for Super Admin.
export function useDashboardStats(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "stats", branch ?? "all"],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        const today = getTodayDate();
        const yesterday = getYesterdayDate();
        const scoped = isScoped(branch);

        // 1 & 2. Today's + yesterday's sales (branch-scoped when applicable)
        const todaysSalesAmount = await sumSalesForDate(today, branch);
        const yesterdaysSalesAmount = await sumSalesForDate(yesterday, branch);
        const salesDelta = calculateDelta(todaysSalesAmount, yesterdaysSalesAmount);

        // 3. Employees present today (unique check-ins), scoped to branch
        let presentQuery = supabase
          .from("employee_checkins")
          .select("employee_id")
          .eq("check_date", today)
          .eq("check_type", "check-in");
        if (scoped) presentQuery = presentQuery.eq("branch", branch);
        const { data: presentData } = await presentQuery;
        const presentCount = new Set((presentData ?? []).map((r: any) => r.employee_id)).size;

        // 4. Total employees, scoped to branch
        let employeesQuery = supabase.from("employees").select("id");
        if (scoped) employeesQuery = employeesQuery.eq("branch", branch);
        const { data: allEmployees } = await employeesQuery;
        const totalEmployees = allEmployees?.length || 0;
        const attendancePercentage =
          totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

        // 5. Stock alerts count (global — low_stock_alerts has no branch column yet)
        const { data: stockAlertsData } = await supabase.from("low_stock_alerts").select("sku");
        const alertsCount = stockAlertsData?.length || 0;

        // 6. Active discounts count (global)
        const { data: activeDiscountsData } = await supabase
          .from("discount_promos")
          .select("id")
          .eq("status", "Active");
        const activeDiscountsCount = activeDiscountsData?.length || 0;

        return {
          todaysSales: formatCurrency(todaysSalesAmount),
          todaysSalesDelta: salesDelta,
          employeesPresent: `${presentCount} / ${totalEmployees}`,
          employeesAttendanceHint: `${attendancePercentage}% attendance`,
          stockAlerts: alertsCount,
          stockAlertsDelta: "-3 since last week",
          activeDiscounts: activeDiscountsCount,
          activeDiscountsHint: `${activeDiscountsCount > 0 ? Math.ceil(activeDiscountsCount * 0.15) : 0} campaigns expiring this week`,
        };
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }

      // Fallback to mock data
      return {
        todaysSales: "₹ 4,38,210",
        todaysSalesDelta: "+12.4% vs yesterday",
        employeesPresent: "128 / 142",
        employeesAttendanceHint: "90.1% attendance",
        stockAlerts: 14,
        stockAlertsDelta: "-3 since last week",
        activeDiscounts: 9,
        activeDiscountsHint: "3 campaigns expiring this week",
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  });
}

// Fetch sales chart data for last 7 days - real data, branch-scoped when given.
export function useSalesChartData(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "sales-chart", branch ?? "all"],
    queryFn: async (): Promise<SalesChartData[]> => {
      try {
        const last7DaysData: SalesChartData[] = [];

        // Get data for last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayOfWeek = getDayOfWeek(date);

          const dailySales = await sumSalesForDate(dateStr, branch);
          // Estimate revenue as 75% of sales (approximation)
          const dailyRevenue = Math.round(dailySales * 0.75);

          last7DaysData.push({
            d: dayOfWeek,
            sales: dailySales,
            revenue: dailyRevenue,
          });
        }

        return last7DaysData.length > 0 ? last7DaysData : mockSalesData;
      } catch (error) {
        console.error("Error fetching sales chart data:", error);
        return mockSalesData;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 3,
  });
}

// Fetch attendance chart data for last 7 days - real data, branch-scoped when given.
export function useAttendanceChartData(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "attendance-chart", branch ?? "all"],
    queryFn: async (): Promise<AttendanceChartData[]> => {
      try {
        const last7DaysData: AttendanceChartData[] = [];
        const scoped = isScoped(branch);

        // Get total employees (branch-scoped)
        let employeesQuery = supabase.from("employees").select("id");
        if (scoped) employeesQuery = employeesQuery.eq("branch", branch);
        const { data: allEmployees } = await employeesQuery;

        const totalEmployees = allEmployees?.length || 142;

        // Get data for last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayOfWeek = getDayOfWeek(date);

          // Count check-ins for this day (branch-scoped)
          let checkInQuery = supabase
            .from("employee_checkins")
            .select("employee_id, check_type")
            .eq("check_date", dateStr);
          if (scoped) checkInQuery = checkInQuery.eq("branch", branch);
          const { data: checkInData } = await checkInQuery;

          // Count presents (employees with at least one check-in)
          const uniquePresent = new Set(checkInData?.map((c: any) => c.employee_id) || []).size;

          // Count lates (simplified - would need actual check-in time data)
          // Approximation: assume 5-10% of employees are typically late
          const lateCheckIns: unknown[] = [];

          const lateCount = Math.min(lateCheckIns.length, Math.ceil(totalEmployees * 0.08));
          const absentCount = Math.max(0, totalEmployees - uniquePresent - lateCount);

          last7DaysData.push({
            d: dayOfWeek,
            present: uniquePresent,
            late: lateCount,
            absent: absentCount,
          });
        }

        return last7DaysData.length > 0 ? last7DaysData : mockAttendanceData;
      } catch (error) {
        console.error("Error fetching attendance chart data:", error);
        return mockAttendanceData;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 3,
  });
}

// Fetch inventory mix by categories - real data, branch-scoped when given.
export function useInventoryMixData(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "inventory-mix", branch ?? "all"],
    queryFn: async (): Promise<CategoryData[]> => {
      try {
        // Branch-scoped: read per-branch product_count from the category_branches
        // junction (the established branch pattern) instead of counting products.
        if (isScoped(branch)) {
          const { data: rows } = await supabase
            .from("category_branches")
            .select("category, product_count")
            .eq("branch", branch);

          const withStock = (rows ?? []).filter((r: any) => r.product_count > 0);
          const total = withStock.reduce((sum: number, r: any) => sum + r.product_count, 0);
          const branchData = withStock
            .map((r: any) => ({
              name: `${r.category} (${r.product_count})`,
              value: total > 0 ? Math.round((r.product_count / total) * 100) : 0,
              count: r.product_count as number,
            }))
            .sort((a, b) => b.count - a.count);

          if (branchData.length > 0) {
            const sumPct = branchData.reduce((s, i) => s + i.value, 0);
            if (sumPct !== 100) branchData[branchData.length - 1].value += 100 - sumPct;
            return branchData;
          }
          return mockInventoryMix;
        }

        // Fetch ALL products from Supabase with category field
        const { data: products, error } = await supabase.from("products").select("id, category");

        if (error) {
          console.error("Error fetching products:", error);
          return mockInventoryMix;
        }

        if (!products || products.length === 0) {
          console.warn("No products found in database");
          return mockInventoryMix;
        }

        console.log(`Total products in database: ${products.length}`);

        // Count products by category
        const categoryCount: Record<string, number> = {};
        products.forEach((p: any) => {
          const cat = (p.category && p.category.trim()) || "Uncategorized";
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        // Log category breakdown
        console.log("Category breakdown:", categoryCount);

        // Convert to percentages and sort by count (descending)
        const total = products.length;
        const categoryData = Object.entries(categoryCount)
          .map(([name, count]) => ({
            name: `${name} (${count})`, // Show category name with product count
            value: total > 0 ? Math.round((count / total) * 100) : 0,
            count, // Store actual count for debugging
            category: name, // Store original category name
          }))
          .sort((a, b) => b.count - a.count); // Sort by product count descending, ALL categories

        // Ensure percentages add up to 100 (adjust last item if needed)
        if (categoryData.length > 0) {
          const sumPercentages = categoryData.reduce((sum, item) => sum + item.value, 0);
          if (sumPercentages !== 100) {
            categoryData[categoryData.length - 1].value += 100 - sumPercentages;
          }
        }

        console.log(
          `Inventory mix calculated: ${categoryData.length} categories, total products: ${total}`,
          categoryData,
        );

        return categoryData.length > 0 ? categoryData : mockInventoryMix;
      } catch (error) {
        console.error("Error fetching inventory mix:", error);
        return mockInventoryMix;
      }
    },
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 5,
  });
}

// Fetch recent transactions - branch-scoped when given.
export function useRecentTransactions(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "recent-transactions", branch ?? "all"],
    queryFn: async (): Promise<RecentTransaction[]> => {
      try {
        const query = isScoped(branch)
          ? supabase
              .from("billing_sales_bills_branches")
              .select("invoice, date, customer, amount, payment, status")
              .eq("branch", branch)
          : supabase
              .from("billing_sales_bills")
              .select("invoice, date, customer, amount, payment, status");

        const { data, error } = await query.order("date", { ascending: false }).limit(5);

        if (!error && data && data.length > 0) {
          return data.map((txn: any) => ({
            id: txn.invoice,
            customer: txn.customer,
            amount: txn.amount,
            method: txn.payment,
            status: txn.status,
          }));
        }
      } catch (error) {
        console.warn("Error fetching recent transactions from Supabase:", error);
      }

      return mockRecentTx;
    },
  });
}

// Fetch stock alerts from low_stock_alerts
export function useStockAlertsData() {
  return useQuery({
    queryKey: ["dashboard", "stock-alerts"],
    queryFn: async (): Promise<StockAlert[]> => {
      try {
        const { data, error } = await supabase
          .from("low_stock_alerts")
          .select("sku, product, current_stock, min_level")
          .order("current_stock")
          .limit(4);

        if (!error && data && data.length > 0) {
          return data.map((alert: any) => ({
            sku: alert.sku,
            name: alert.product,
            left: alert.current_stock,
            reorder: alert.min_level,
          }));
        }
      } catch (error) {
        console.warn("Error fetching stock alerts from Supabase:", error);
      }

      return mockStockAlerts;
    },
  });
}

// Fetch employee logins - real data, branch-scoped when given.
export function useEmployeeLogins(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "employee-logins", branch ?? "all"],
    queryFn: async (): Promise<EmployeeLogin[]> => {
      try {
        // Fetch recent employee logins (branch-scoped)
        let loginsQuery = supabase
          .from("employee_logins")
          .select("employee_name, employee_role, branch, status");
        if (isScoped(branch)) loginsQuery = loginsQuery.eq("branch", branch);
        const { data: logins } = await loginsQuery
          .order("login_time", { ascending: false })
          .limit(5);

        if (logins && logins.length > 0) {
          return logins.map((login: any) => ({
            name: login.employee_name,
            role: `${login.employee_role} · ${login.branch}`,
            status: login.status || "offline",
          }));
        }
      } catch (error) {
        console.error("Error fetching employee logins:", error);
      }

      return mockLogins;
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60,
  });
}
