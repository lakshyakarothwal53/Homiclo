import {
  LayoutDashboard,
  Clock,
  Users,
  Package,
  ScanLine,
  Receipt,
  Tag,
  BarChart3,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavLeaf = { label: string; to: string };
export type NavGroup = {
  label: string;
  icon: LucideIcon;
  to?: string;
  children?: NavLeaf[];
};

export const NAV: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  {
    label: "Attendance",
    icon: Clock,
    children: [
      { label: "Overview", to: "/attendance" },
      { label: "Daily Logs", to: "/attendance/logs" },
      { label: "History", to: "/attendance/history" },
      { label: "Late Arrivals", to: "/attendance/late" },
      { label: "Absent Report", to: "/attendance/absent" },
      { label: "Live Tracking", to: "/attendance/live" },
      { label: "Reports", to: "/attendance/reports" },
      { label: "Settings", to: "/attendance/settings" },
    ],
  },
  {
    label: "Employees",
    icon: Users,
    children: [
      { label: "Employee List", to: "/employees" },
      { label: "Add Employee", to: "/employees/add" },
      { label: "Profile", to: "/employees/profile" },
      { label: "Login Monitoring", to: "/employees/login-monitoring" },
      { label: "Activity Tracking", to: "/employees/activity" },
      { label: "Location Tracking", to: "/employees/location" },
      { label: "Reports", to: "/employees/reports" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { label: "Overview", to: "/inventory" },
      { label: "Products", to: "/inventory/products" },
      { label: "Categories", to: "/inventory/categories" },
      { label: "Stock Inward", to: "/inventory/stock-inward" },
      { label: "Stock Outward", to: "/inventory/stock-outward" },
      { label: "Stock Adjustment", to: "/inventory/stock-adjustment" },
      { label: "Low Stock Alerts", to: "/inventory/alerts" },
      { label: "Stock History", to: "/inventory/history" },
      { label: "Reports", to: "/inventory/reports" },
    ],
  },
  {
    label: "POS",
    icon: ScanLine,
    children: [
      { label: "POS Dashboard", to: "/pos" },
      { label: "Scanner", to: "/pos/scanner" },
      { label: "Transactions", to: "/pos/transactions" },
      { label: "Settings", to: "/pos/settings" },
    ],
  },
  {
    label: "Billing",
    icon: Receipt,
    children: [
      { label: "Overview", to: "/billing" },
      { label: "Create Invoice", to: "/billing/create-invoice" },
      { label: "Sales Bills", to: "/billing/sales-bills" },
      { label: "Payments", to: "/billing/payments" },
      { label: "Gateway", to: "/billing/gateway" },
      { label: "Refunds", to: "/billing/refunds" },
      { label: "Tax Invoices", to: "/billing/tax-invoices" },
      { label: "Tally Sync", to: "/billing/tally-sync" },
      { label: "Reports", to: "/billing/reports" },
    ],
  },
  {
    label: "Discounts",
    icon: Tag,
    children: [
      { label: "Overview", to: "/discounts" },
      { label: "Product Discounts", to: "/discounts/products" },
      { label: "Category Discounts", to: "/discounts/categories" },
      { label: "Flat Discounts", to: "/discounts/flat" },
      { label: "Percentage Discounts", to: "/discounts/percentage" },
      { label: "Campaigns", to: "/discounts/campaigns" },
      { label: "Seasonal Offers", to: "/discounts/seasonal" },
      { label: "Usage Reports", to: "/discounts/usage-reports" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { label: "Sales", to: "/reports/sales" },
      { label: "Attendance", to: "/reports/attendance" },
      { label: "Employee", to: "/reports/employee" },
      { label: "Inventory", to: "/reports/inventory" },
      { label: "Discount Performance", to: "/reports/discount" },
      { label: "Financial", to: "/reports/financial" },
      { label: "Export", to: "/reports/export" },
    ],
  },
  {
    label: "Notifications",
    icon: Bell,
    children: [
      { label: "Alerts Dashboard", to: "/notifications" },
      { label: "Low Stock", to: "/notifications/low-stock" },
      { label: "Attendance", to: "/notifications/attendance" },
      { label: "Payments", to: "/notifications/payment" },
      { label: "System", to: "/notifications/system" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Company", to: "/settings/company" },
      { label: "Roles & Permissions", to: "/settings/roles" },
      { label: "Payment Gateway", to: "/settings/payment-gateway" },
      { label: "Tally", to: "/settings/tally" },
      { label: "Attendance", to: "/settings/attendance" },
      { label: "Notifications", to: "/settings/notifications" },
      { label: "Preferences", to: "/settings/preferences" },
    ],
  },
];