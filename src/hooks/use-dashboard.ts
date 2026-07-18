import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchLowStockAlerts } from "@/lib/inventory-utils";
import { parseRowDate } from "@/lib/report-data";

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

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAmount(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  return parseFloat(raw.replace("₹", "").replace(/,/g, "")) || 0;
}

// "09:31 AM" → minutes since midnight, or null when unparseable.
function parseTimeToMinutes(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

const LATE_CUTOFF_MINUTES = 9 * 60 + 15; // 09:15 AM shift start + grace

// A branch is "scoped" when it names a real branch (not undefined / "all").
// Scoped reads use the per-branch junction table (billing_sales_bills_branches);
// unscoped (Super Admin) reads use the global table. Same pattern as inventory.
function isScoped(branch?: string): boolean {
  return !!branch && branch !== "all";
}

function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// Sum manually-created invoices (billing_sales_bills) for a given (ISO)
// date, scoped to a branch when provided.
//
// billing_sales_bills_branches predates 04_computed.sql (which added
// bill_date/amount_num to the global billing_sales_bills table), so the
// branch-scoped junction table only has the original free-text `date`
// column. Match against that via parseRowDate instead of filtering on a
// bill_date column that may not exist yet on this table.
async function sumBillingSalesForDate(date: string, branch?: string): Promise<number> {
  const sumRows = (rows: { amount?: string }[] | null) =>
    (rows ?? []).reduce((total, row) => total + parseAmount(row.amount), 0);

  if (isScoped(branch)) {
    const { data } = await supabase
      .from("billing_sales_bills_branches")
      .select("amount, date")
      .eq("branch", branch);
    const matching = (data ?? []).filter((row) => {
      const d = parseRowDate(row.date);
      return d ? isoOf(d) === date : false;
    });
    return sumRows(matching);
  }
  const { data } = await supabase
    .from("billing_sales_bills")
    .select("amount")
    .eq("bill_date", date);
  return sumRows(data);
}

// Sum POS checkout sales (pos_transactions) for a given (ISO) date, scoped
// to a branch when provided. pos_transactions carries both `created_at`
// and `branch` on the global table, so it's read directly instead of the
// branch-junction table (pos_transactions_branches has no date column).
async function sumPosSalesForDate(date: string, branch?: string): Promise<number> {
  let query = supabase
    .from("pos_transactions")
    .select("amount")
    .gte("created_at", `${date}T00:00:00.000Z`)
    .lt("created_at", `${addDaysIso(date, 1)}T00:00:00.000Z`);
  if (isScoped(branch)) query = query.eq("branch", branch);
  const { data } = await query;
  return (data ?? []).reduce((total, row) => total + parseAmount(row.amount), 0);
}

// Sales Today = manually-created invoices + POS checkout sales, since POS
// checkout (useCreatePosTransaction) only ever writes to pos_transactions,
// never to billing_sales_bills.
async function sumSalesForDate(date: string, branch?: string): Promise<number> {
  const [billing, pos] = await Promise.all([
    sumBillingSalesForDate(date, branch),
    sumPosSalesForDate(date, branch),
  ]);
  return billing + pos;
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
      const presentCount = new Set((presentData ?? []).map((r) => r.employee_id)).size;

      // 4. Total employees, scoped to branch
      let employeesQuery = supabase.from("employees").select("id");
      if (scoped) employeesQuery = employeesQuery.eq("branch", branch);
      const { data: allEmployees } = await employeesQuery;
      const totalEmployees = allEmployees?.length || 0;
      const attendancePercentage =
        totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

      // 5. Stock alerts, derived live. Branch-scoped sessions measure against
      // the stock that branch actually holds (branch_inventory); Super Admin
      // measures the central warehouse.
      const stockAlertsData = await fetchLowStockAlerts(branch);
      const alertsCount = stockAlertsData.length;
      const criticalCount = stockAlertsData.filter((a) => a.status === "Critical").length;

      // 6. Active discounts count + expiring within 7 days. Deliberately GLOBAL:
      // promos are company-wide in this data model (discount_promos_branches
      // exists but is unpopulated), so a promo applies at every branch.
      const { data: activeDiscountsData } = await supabase
        .from("discount_promos")
        .select("id, valid_to")
        .eq("status", "Active");
      const activeDiscountsCount = activeDiscountsData?.length || 0;
      const weekAhead = new Date();
      weekAhead.setDate(weekAhead.getDate() + 7);
      const expiringSoon = (activeDiscountsData ?? []).filter((d) => {
        if (!d.valid_to) return false;
        const to = new Date(d.valid_to);
        return !Number.isNaN(to.getTime()) && to >= new Date(today) && to <= weekAhead;
      }).length;

      return {
        todaysSales: formatCurrency(todaysSalesAmount),
        todaysSalesDelta: salesDelta,
        employeesPresent: `${presentCount} / ${totalEmployees}`,
        employeesAttendanceHint: `${attendancePercentage}% attendance`,
        stockAlerts: alertsCount,
        stockAlertsDelta: `${criticalCount} critical`,
        activeDiscounts: activeDiscountsCount,
        activeDiscountsHint: `${expiringSoon} expiring this week`,
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
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceIso = isoOf(since);

      const byDate: Record<string, number> = {};

      if (isScoped(branch)) {
        // billing_sales_bills_branches has no bill_date column — see the
        // comment on sumSalesForDate above.
        const { data } = await supabase
          .from("billing_sales_bills_branches")
          .select("amount, date")
          .eq("branch", branch);
        (data ?? []).forEach((row) => {
          const d = parseRowDate(row.date);
          if (!d) return;
          const iso = isoOf(d);
          if (iso < sinceIso) return;
          byDate[iso] = (byDate[iso] ?? 0) + parseAmount(row.amount);
        });
      } else {
        const { data } = await supabase
          .from("billing_sales_bills")
          .select("amount, bill_date")
          .gte("bill_date", sinceIso);
        (data ?? []).forEach((row) => {
          if (!row.bill_date) return;
          byDate[row.bill_date] = (byDate[row.bill_date] ?? 0) + parseAmount(row.amount);
        });
      }

      // POS checkout sales for the same window — pos_transactions is where
      // useCreatePosTransaction actually writes, so it's merged in here too
      // (see sumSalesForDate above for the same fix on the stat card).
      let posQuery = supabase
        .from("pos_transactions")
        .select("amount, created_at")
        .gte("created_at", `${sinceIso}T00:00:00.000Z`);
      if (isScoped(branch)) posQuery = posQuery.eq("branch", branch);
      const { data: posData } = await posQuery;
      (posData ?? []).forEach((row) => {
        const iso = row.created_at?.split("T")[0];
        if (!iso) return;
        byDate[iso] = (byDate[iso] ?? 0) + parseAmount(row.amount);
      });

      const last7DaysData: SalesChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dailySales = byDate[dateStr] ?? 0;
        last7DaysData.push({
          d: getDayOfWeek(date),
          sales: dailySales,
          // Revenue approximated as 75% of gross sales (no cost data yet)
          revenue: Math.round(dailySales * 0.75),
        });
      }
      return last7DaysData;
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
      const scoped = isScoped(branch);

      // Get total employees (branch-scoped)
      let employeesQuery = supabase.from("employees").select("id");
      if (scoped) employeesQuery = employeesQuery.eq("branch", branch);
      const { data: allEmployees } = await employeesQuery;
      const totalEmployees = allEmployees?.length || 0;

      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceIso = since.toISOString().split("T")[0];

      let checkInQuery = supabase
        .from("employee_checkins")
        .select("employee_id, check_date, check_time")
        .eq("check_type", "check-in")
        .gte("check_date", sinceIso);
      if (scoped) checkInQuery = checkInQuery.eq("branch", branch);
      const { data: checkInData } = await checkInQuery;

      const last7DaysData: AttendanceChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayRows = (checkInData ?? []).filter((c) => c.check_date === dateStr);
        const firstCheckin = new Map<string, number>();
        dayRows.forEach((c) => {
          const mins = parseTimeToMinutes(c.check_time);
          if (mins === null) return;
          const prev = firstCheckin.get(c.employee_id);
          if (prev === undefined || mins < prev) firstCheckin.set(c.employee_id, mins);
        });

        const uniquePresent = new Set(dayRows.map((c) => c.employee_id)).size;
        const lateCount = [...firstCheckin.values()].filter(
          (mins) => mins > LATE_CUTOFF_MINUTES,
        ).length;
        const absentCount = Math.max(0, totalEmployees - uniquePresent);

        last7DaysData.push({
          d: getDayOfWeek(date),
          present: Math.max(0, uniquePresent - lateCount),
          late: lateCount,
          absent: absentCount,
        });
      }

      return last7DaysData;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 3,
  });
}

// Shared by both the central and the branch path so the two can't drift.
// Percentages are rounded then reconciled to exactly 100 on the last slice.
function toCategoryMix(rows: { category?: string | null }[]): CategoryData[] {
  if (rows.length === 0) return [];
  const counts: Record<string, number> = {};
  rows.forEach((p) => {
    const cat = (p.category && p.category.trim()) || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const total = rows.length;
  const mix = Object.entries(counts)
    .map(([name, count]) => ({
      name: `${name} (${count})`,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const sum = mix.reduce((s, i) => s + i.value, 0);
  if (mix.length > 0 && sum !== 100) mix[mix.length - 1].value += 100 - sum;
  return mix;
}

// Inventory mix by category.
//   Super Admin  → the central catalogue.
//   A branch     → only the products actually allocated to it, counted from
//                  branch_inventory. (An earlier version read the
//                  category_branches junction, which is unpopulated and so
//                  showed every branch admin an empty chart; branch_inventory
//                  is real allocation data — see supabase/17_branch_inventory.sql.)
export function useInventoryMixData(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "inventory-mix", branch ?? "all"],
    queryFn: async (): Promise<CategoryData[]> => {
      if (isScoped(branch)) {
        const { data: allocations, error: allocError } = await supabase
          .from("branch_inventory")
          .select("sku, stock")
          .eq("branch", branch)
          .gt("stock", 0);
        if (allocError) throw allocError;
        if (!allocations || allocations.length === 0) return [];

        const { data: rows, error: prodError } = await supabase
          .from("products")
          .select("sku, category")
          .in(
            "sku",
            allocations.map((a) => a.sku),
          );
        if (prodError) throw prodError;
        return toCategoryMix(rows ?? []);
      }

      const { data: products, error } = await supabase.from("products").select("sku, category");
      if (error) throw error;
      return toCategoryMix(products ?? []);
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
      if (isScoped(branch)) {
        // billing_sales_bills_branches has no bill_date column — order by
        // invoice (monotonically increasing) and sort by parsed `date` too,
        // matching the recency ordering the global path gets from bill_date.
        const { data, error } = await supabase
          .from("billing_sales_bills_branches")
          .select("invoice, date, customer, amount, payment, status")
          .eq("branch", branch)
          .order("invoice", { ascending: false });
        if (error) throw error;

        const sorted = [...(data ?? [])].sort((a, b) => {
          const da = parseRowDate(a.date)?.getTime() ?? 0;
          const db = parseRowDate(b.date)?.getTime() ?? 0;
          return db - da || b.invoice.localeCompare(a.invoice);
        });
        return sorted.slice(0, 5).map((txn) => ({
          id: txn.invoice,
          customer: txn.customer,
          amount: txn.amount,
          method: txn.payment,
          status: txn.status,
        }));
      }

      const { data, error } = await supabase
        .from("billing_sales_bills")
        .select("invoice, date, customer, amount, payment, status, bill_date")
        .order("bill_date", { ascending: false })
        .order("invoice", { ascending: false })
        .limit(5);
      if (error) throw error;

      return (data ?? []).map((txn) => ({
        id: txn.invoice,
        customer: txn.customer,
        amount: txn.amount,
        method: txn.payment,
        status: txn.status,
      }));
    },
  });
}

// Stock alerts, derived live from products (stock < min_stock).
export function useStockAlertsData(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "stock-alerts", branch ?? "all"],
    queryFn: async (): Promise<StockAlert[]> => {
      // Branch-scoped: alerts measured against that branch's own holding, so
      // the widget agrees with the Stock Alerts KPI above it.
      const alerts = await fetchLowStockAlerts(branch);
      return alerts.slice(0, 4).map((alert) => ({
        sku: alert.sku,
        name: alert.product,
        left: alert.currentStock,
        reorder: alert.minLevel,
      }));
    },
  });
}

// Fetch employee logins - real data, branch-scoped when given.
export function useEmployeeLogins(branch?: string) {
  return useQuery({
    queryKey: ["dashboard", "employee-logins", branch ?? "all"],
    queryFn: async (): Promise<EmployeeLogin[]> => {
      let loginsQuery = supabase
        .from("employee_logins")
        .select("employee_name, employee_role, branch, status");
      if (isScoped(branch)) loginsQuery = loginsQuery.eq("branch", branch);
      const { data: logins, error } = await loginsQuery
        .order("login_time", { ascending: false })
        .limit(5);
      if (error) throw error;

      return (logins ?? []).map((login) => ({
        name: login.employee_name,
        role: login.employee_role.includes("·")
          ? login.employee_role
          : `${login.employee_role} · ${login.branch}`,
        status: login.status || "offline",
      }));
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60,
  });
}
