import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Circle,
  Clock,
  Diamond,
  IndianRupee,
  RefreshCw,
  Tag,
  TrendingUp,
  UserX,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { fetchLowStockAlerts } from "@/lib/inventory-utils";
import { LATE_CUTOFF_MINUTES, SHIFT_START_MINUTES, parseTimeToMinutes } from "@/lib/report-data";
import type { AlertItem } from "@/types/notifications";

// Alerts are derived live from the module tables (stock, attendance, billing,
// tally) — not from a seeded notifications list — so every alert reflects the
// current state of the data.

async function stockAlerts(): Promise<AlertItem[]> {
  const data = await fetchLowStockAlerts();
  return data.map(
    (a): AlertItem => ({
      id: `stock-${a.sku}`,
      title:
        a.currentStock === 0
          ? `Critical: ${a.product} out of stock`
          : `${a.product} — ${a.currentStock} units left`,
      description:
        a.currentStock === 0
          ? `${a.sku} has 0 units remaining. Reorder immediately.`
          : `${a.sku} is below the minimum level (${a.minLevel}).`,
      time: a.status,
      tone: a.status === "Critical" || a.currentStock === 0 ? "danger" : "warning",
      icon: a.currentStock === 0 ? AlertTriangle : Diamond,
      category: "stock",
    }),
  );
}

// Derived entirely from real employees + their own employee_checkins/
// absent_records rows — late_arrivals is a demo table with zero real
// employees in it (every row is a seeded EMP0xx code), and employee_checkins/
// absent_records themselves mix in that same demo data alongside real rows,
// so both are filtered down to the real `employees` roster first.
async function attendanceAlerts(): Promise<AlertItem[]> {
  const { data: employees, error: empError } = await supabase.from("employees").select("id, name");
  if (empError) throw empError;
  const realIds = (employees ?? []).map((e) => e.id);
  if (realIds.length === 0) return [];
  const nameById = new Map((employees ?? []).map((e) => [e.id, e.name]));

  const [checkins, absent] = await Promise.all([
    supabase
      .from("employee_checkins")
      .select("id, employee_id, employee_name, check_type, check_time, check_date, status")
      .in("employee_id", realIds)
      .eq("check_type", "check-in")
      .order("check_date", { ascending: false })
      .limit(20),
    supabase
      .from("absent_records")
      .select("id, date, employee_id, employee_name, leave_type, reason")
      .in("employee_id", realIds)
      .order("date", { ascending: false })
      .limit(10),
  ]);

  // Earliest check-in per employee per day decides late-vs-on-time, same
  // cutoff useAttendanceDashboard/useEmployeeAttendance use.
  const firstByEmployeeDate = new Map<string, { time: string; mins: number }>();
  (checkins.data ?? [])
    .filter((c) => !c.status || c.status === "success")
    .forEach((c) => {
      const mins = parseTimeToMinutes(c.check_time);
      if (mins === null) return;
      const key = `${c.employee_id}|${c.check_date}`;
      const prev = firstByEmployeeDate.get(key);
      if (!prev || mins < prev.mins) firstByEmployeeDate.set(key, { time: c.check_time, mins });
    });

  const lateAlerts: AlertItem[] = [...firstByEmployeeDate.entries()]
    .filter(([, v]) => v.mins > LATE_CUTOFF_MINUTES)
    .map(([key, v]) => {
      const [employeeId, date] = key.split("|");
      return {
        id: `late-${key}`,
        title: `${nameById.get(employeeId) ?? "Employee"} arrived late (${v.mins - SHIFT_START_MINUTES} min)`,
        description: `Checked in at ${v.time}.`,
        time: date,
        tone: "warning",
        icon: Clock,
        category: "attendance",
      } satisfies AlertItem;
    });

  return [
    ...lateAlerts,
    ...(absent.data ?? []).map(
      (a): AlertItem => ({
        id: `absent-${a.id}`,
        title: `${a.employee_name} absent (${a.leave_type ?? "no notice"})`,
        description: a.reason || "No reason recorded.",
        time: a.date,
        tone: "danger",
        icon: UserX,
        category: "attendance",
      }),
    ),
    ...(checkins.data ?? []).slice(0, 5).map(
      (c): AlertItem => ({
        id: `checkin-${c.id}`,
        title: `${c.employee_name} checked in`,
        description: `At ${c.check_time}.`,
        time: c.check_date,
        tone: "info",
        icon: Circle,
        category: "attendance",
      }),
    ),
  ];
}

// Payments are the money side of a POS sale (see useBillingPayments in
// use-billing.ts) — billing_payments is a legacy table that's mostly old
// seed rows plus a couple of manually-typed test entries, not the real
// payment ledger, so it's read straight from pos_transactions instead.
async function paymentAlerts(): Promise<AlertItem[]> {
  const [payments, refunds] = await Promise.all([
    supabase
      .from("pos_transactions")
      .select("invoice, amount, payment, status, customer_name, invoice_date, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("billing_refunds")
      .select("refund, invoice, customer, amount, reason, status")
      .order("refund_date", { ascending: false })
      .limit(5),
  ]);

  return [
    ...(payments.data ?? []).map(
      (p): AlertItem => ({
        id: `pay-${p.invoice}`,
        title:
          p.status === "Completed"
            ? `Payment ${p.amount} received`
            : `Payment pending: ${p.invoice}`,
        description: `${p.invoice} · ${p.customer_name || "Walk-in"} via ${p.payment}`,
        time: p.invoice_date || String(p.created_at ?? "").slice(0, 10),
        tone: p.status === "Completed" ? "success" : "warning",
        icon: p.status === "Completed" ? TrendingUp : Clock,
        category: "payment",
      }),
    ),
    ...(refunds.data ?? []).map(
      (r): AlertItem => ({
        id: `refund-${r.refund}`,
        title: `Refund ${r.amount} — ${r.status}`,
        description: `${r.invoice} · ${r.customer} · ${r.reason}`,
        time: r.status,
        tone: "danger",
        icon: IndianRupee,
        category: "payment",
      }),
    ),
  ];
}

async function systemAlerts(): Promise<AlertItem[]> {
  const [tally, promos] = await Promise.all([
    supabase
      .from("billing_tally_log")
      .select("time, voucher, reference, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("discount_promos")
      .select("id, name, code, valid_to, status")
      .eq("status", "Active")
      .limit(5),
  ]);

  return [
    ...(tally.data ?? []).map(
      (t): AlertItem => ({
        id: `tally-${t.reference}-${t.created_at}`,
        title:
          t.status === "Synced"
            ? `Tally sync: ${t.reference} pushed`
            : `Tally sync failed for ${t.reference}`,
        description: `${t.voucher} voucher · ${t.amount}`,
        time: t.time,
        tone: t.status === "Synced" ? "info" : "danger",
        icon: RefreshCw,
        category: "system",
      }),
    ),
    ...(promos.data ?? []).map(
      (p): AlertItem => ({
        id: `promo-${p.id}`,
        title: `Discount '${p.name}' is live`,
        description: `Code ${p.code} · valid till ${p.valid_to}`,
        time: p.valid_to ?? "",
        tone: "brand",
        icon: Tag,
        category: "system",
      }),
    ),
  ];
}

export function useNotifications(category: string) {
  return useQuery({
    queryKey: ["notifications", category],
    queryFn: async (): Promise<AlertItem[]> => {
      switch (category) {
        case "stock":
          return stockAlerts();
        case "attendance":
          return attendanceAlerts();
        case "payment":
          return paymentAlerts();
        case "system":
          return systemAlerts();
        default: {
          const [stock, attendance, payment, system] = await Promise.all([
            stockAlerts(),
            attendanceAlerts(),
            paymentAlerts(),
            systemAlerts(),
          ]);
          // Interleave the most urgent first: critical stock, then the rest.
          const all = [...stock, ...attendance, ...payment, ...system];
          const rank = { danger: 0, warning: 1, brand: 2, info: 3, success: 4 } as const;
          return all.sort((a, b) => (rank[a.tone] ?? 5) - (rank[b.tone] ?? 5));
        }
      }
    },
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * Email the current alerts to the super admin via the `notify-admin` Supabase
 * Edge Function (see supabase/functions/notify-admin). The admin address comes
 * from Settings › Notifications (app_settings key "notifications").
 */
export function useEmailAlertsToAdmin() {
  return useMutation({
    mutationFn: async (alerts: AlertItem[]): Promise<{ to: string }> => {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "notifications")
        .maybeSingle();
      const to =
        (setting?.value as { adminEmail?: string } | null)?.adminEmail ??
        "piyush.novavision@gmail.com";

      const rows = alerts
        .map(
          (a) =>
            `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;"><b>${a.title}</b><br/><span style="color:#666;">${a.description}</span></td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#999;">${a.time}</td></tr>`,
        )
        .join("");
      const html = `<div style="font-family:Arial,sans-serif;">
        <h2 style="color:#FE0000;">HOMIQLO — Alerts Digest</h2>
        <p>${alerts.length} active alert${alerts.length !== 1 ? "s" : ""} as of ${new Date().toLocaleString("en-IN")}.</p>
        <table style="border-collapse:collapse;width:100%;">${rows}</table>
      </div>`;

      const { error } = await supabase.functions.invoke("notify-admin", {
        body: { to, subject: `HOMIQLO alerts digest — ${alerts.length} active`, html },
      });
      if (error) {
        throw new Error(
          "Email function not reachable. Deploy supabase/functions/notify-admin (see its README) to enable admin emails.",
        );
      }
      return { to };
    },
  });
}
