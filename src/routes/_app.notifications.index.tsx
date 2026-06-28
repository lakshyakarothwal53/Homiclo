import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import {
  AlertList,
  ALL_ALERTS,
  STOCK_ALERTS,
  ATTENDANCE_ALERTS,
  PAYMENT_ALERTS,
  SYSTEM_ALERTS,
  type AlertCategory,
  type AlertItem,
} from "@/components/notifications/alerts";

export const Route = createFileRoute("/_app/notifications/")({
  head: () => ({
    meta: [
      { title: "Alerts Dashboard — HOMIQLO" },
      { name: "description", content: "All system alerts in one place." },
    ],
  }),
  component: Page,
});

type TabKey = "all" | AlertCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stock", label: "Stock" },
  { key: "attendance", label: "Attendance" },
  { key: "payment", label: "Payment" },
  { key: "system", label: "System" },
];

const TAB_DATA: Record<TabKey, AlertItem[]> = {
  all: ALL_ALERTS,
  stock: STOCK_ALERTS,
  attendance: ATTENDANCE_ALERTS,
  payment: PAYMENT_ALERTS,
  system: SYSTEM_ALERTS,
};

function Page() {
  const [tab, setTab] = useState<TabKey>("all");

  const items = useMemo(() => TAB_DATA[tab], [tab]);

  return (
    <>
      <PageHeader
        eyebrow="Notifications › Alerts"
        title="Alerts Dashboard"
        description="Alerts overview and controls."
      />

      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors cursor-pointer",
                tab === t.key
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <AlertList items={items} />
    </>
  );
}
