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
import type { AlertItem } from "@/types/notifications";

// Alerts are derived live from the module tables (stock, attendance, billing,
// tally) — not from a seeded notifications list — so every alert reflects the
// current state of the data.

async function stockAlerts(): Promise<AlertItem[]> {
  const { data } = await supabase
    .from("low_stock_alerts")
    .select("sku, product, current_stock, min_level, status")
    .order("current_stock");
  return (data ?? []).map(
    (a): AlertItem => ({
      id: `stock-${a.sku}`,
      title:
        a.current_stock === 0
          ? `Critical: ${a.product} out of stock`
          : `${a.product} — ${a.current_stock} units left`,
      description:
        a.current_stock === 0
          ? `${a.sku} has 0 units remaining. Reorder immediately.`
          : `${a.sku} is below the minimum level (${a.min_level}).`,
      time: a.status,
      tone: a.status === "Critical" || a.current_stock === 0 ? "danger" : "warning",
      icon: a.current_stock === 0 ? AlertTriangle : Diamond,
      category: "stock",
    }),
  );
}

async function attendanceAlerts(): Promise<AlertItem[]> {
  const [late, absent, checkins] = await Promise.all([
    supabase
      .from("late_arrivals")
      .select("id, date, employee_name, check_in_time, lateness_minutes")
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("absent_records")
      .select("id, date, employee_name, leave_type, reason")
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("employee_checkins")
      .select("id, employee_name, check_type, check_time, check_date")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return [
    ...(late.data ?? []).map(
      (l): AlertItem => ({
        id: `late-${l.id}`,
        title: `${l.employee_name} arrived late (${l.lateness_minutes} min)`,
        description: `Checked in at ${l.check_in_time}.`,
        time: l.date,
        tone: "warning",
        icon: Clock,
        category: "attendance",
      }),
    ),
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
    ...(checkins.data ?? []).map(
      (c): AlertItem => ({
        id: `checkin-${c.id}`,
        title: `${c.employee_name} ${c.check_type === "check-in" ? "checked in" : "checked out"}`,
        description: `At ${c.check_time}.`,
        time: c.check_date,
        tone: "info",
        icon: Circle,
        category: "attendance",
      }),
    ),
  ];
}

async function paymentAlerts(): Promise<AlertItem[]> {
  const [payments, refunds] = await Promise.all([
    supabase
      .from("billing_payments")
      .select("receipt, date, customer, invoice, amount, mode, status, pay_date")
      .order("pay_date", { ascending: false })
      .limit(10),
    supabase
      .from("billing_refunds")
      .select("refund, invoice, customer, amount, reason, status")
      .limit(5),
  ]);

  return [
    ...(payments.data ?? []).map(
      (p): AlertItem => ({
        id: `pay-${p.receipt}`,
        title:
          p.status === "Received"
            ? `Payment ${p.amount} received`
            : `Payment pending: ${p.invoice}`,
        description: `${p.invoice} · ${p.customer} via ${p.mode}`,
        time: p.date,
        tone: p.status === "Received" ? "success" : "warning",
        icon: p.status === "Received" ? TrendingUp : Clock,
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
