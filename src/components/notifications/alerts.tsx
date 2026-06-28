import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Circle,
  Tag,
  Diamond,
  IndianRupee,
  UserCheck,
  UserX,
  LogOut,
  RefreshCw,
  DatabaseBackup,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mock alerts data — replace each array with a Supabase query later
// (e.g. use-notifications filtered by `category`).

export type AlertCategory = "stock" | "attendance" | "payment" | "system";
export type Tone = "danger" | "warning" | "success" | "info" | "brand";

export type AlertItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: Tone;
  icon: LucideIcon;
  category: AlertCategory;
};

const TONE_STYLES: Record<Tone, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-[color:var(--warning)]",
  success: "bg-success/10 text-[color:var(--success)]",
  info: "bg-info/10 text-[color:var(--info)]",
  brand: "bg-brand/10 text-brand",
};

// Combined feed shown on the Alerts Dashboard.
export const ALL_ALERTS: AlertItem[] = [
  {
    id: "a1",
    title: "Critical: Leather Wallet out of stock",
    description: "SKU-2404 has 0 units remaining. Reorder immediately.",
    time: "5 min ago",
    tone: "danger",
    icon: AlertTriangle,
    category: "stock",
  },
  {
    id: "a2",
    title: "Late arrival: Arjun Verma",
    description: "Arrived at 09:31 AM, 31 minutes late.",
    time: "32 min ago",
    tone: "warning",
    icon: Clock,
    category: "attendance",
  },
  {
    id: "a3",
    title: "Payment received ₹4,616",
    description: "INV-10248 settled via UPI.",
    time: "1 hour ago",
    tone: "success",
    icon: TrendingUp,
    category: "payment",
  },
  {
    id: "a4",
    title: "Employee Karan Mehta checked in",
    description: "Login from POS Terminal 1.",
    time: "2 hours ago",
    tone: "info",
    icon: Circle,
    category: "attendance",
  },
  {
    id: "a5",
    title: "Discount campaign 'Diwali Bonanza' is live",
    description: "20% off across all categories until 15 Nov.",
    time: "Yesterday",
    tone: "brand",
    icon: Tag,
    category: "system",
  },
];

export const STOCK_ALERTS: AlertItem[] = [
  {
    id: "s1",
    title: "Leather Wallet — 0 units",
    description: "Critical reorder.",
    time: "5 min ago",
    tone: "danger",
    icon: Diamond,
    category: "stock",
  },
  {
    id: "s2",
    title: "Wireless Earbuds — 8 units",
    description: "Below minimum (20).",
    time: "1 hour ago",
    tone: "warning",
    icon: Diamond,
    category: "stock",
  },
  {
    id: "s3",
    title: "Yoga Mat — 3 units",
    description: "Below minimum (15).",
    time: "3 hours ago",
    tone: "warning",
    icon: Diamond,
    category: "stock",
  },
];

export const ATTENDANCE_ALERTS: AlertItem[] = [
  {
    id: "at1",
    title: "Arjun Verma arrived late (31 min)",
    description: "Office start: 09:00. Arrived 09:31.",
    time: "32 min ago",
    tone: "warning",
    icon: Clock,
    category: "attendance",
  },
  {
    id: "at2",
    title: "Neha Singh absent without notice",
    description: "No check-in recorded.",
    time: "Today 09:30",
    tone: "danger",
    icon: UserX,
    category: "attendance",
  },
  {
    id: "at3",
    title: "Sneha Iyer checked out",
    description: "9h 45m work duration.",
    time: "18:30",
    tone: "info",
    icon: LogOut,
    category: "attendance",
  },
];

export const PAYMENT_ALERTS: AlertItem[] = [
  {
    id: "p1",
    title: "Payment ₹4,616 received",
    description: "INV-10248 via UPI",
    time: "5 min ago",
    tone: "success",
    icon: IndianRupee,
    category: "payment",
  },
  {
    id: "p2",
    title: "Payment pending: INV-10246",
    description: "₹12,400 overdue",
    time: "2 hours ago",
    tone: "warning",
    icon: Clock,
    category: "payment",
  },
  {
    id: "p3",
    title: "Refund ₹680 issued",
    description: "INV-10244 — Rahul Nair",
    time: "Yesterday",
    tone: "danger",
    icon: IndianRupee,
    category: "payment",
  },
];

export const SYSTEM_ALERTS: AlertItem[] = [
  {
    id: "sy1",
    title: "Tally sync completed (48 vouchers)",
    description: "All vouchers up to 14:30 synced.",
    time: "30 min ago",
    tone: "info",
    icon: RefreshCw,
    category: "system",
  },
  {
    id: "sy2",
    title: "Backup pending",
    description: "Last backup: yesterday 23:00.",
    time: "6 hours ago",
    tone: "warning",
    icon: DatabaseBackup,
    category: "system",
  },
  {
    id: "sy3",
    title: "System update v2.4.1 installed",
    description: "New POS features available.",
    time: "Yesterday",
    tone: "success",
    icon: Download,
    category: "system",
  },
];

export function AlertList({ items }: { items: AlertItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No alerts to show here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const Icon = a.icon;
        return (
          <Card key={a.id} className="border-border shadow-sm">
            <CardContent className="flex items-start gap-4 p-4">
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  TONE_STYLES[a.tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
