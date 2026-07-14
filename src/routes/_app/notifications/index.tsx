import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertList, type AlertCategory } from "@/components/notifications/alerts";
import { useEmailAlertsToAdmin, useNotifications } from "@/hooks/use-notifications";

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

function Page() {
  const [tab, setTab] = useState<TabKey>("all");
  const { data: items = [] } = useNotifications(tab);
  const emailAlerts = useEmailAlertsToAdmin();

  function handleEmail() {
    if (items.length === 0) {
      toast.error("No alerts to email.");
      return;
    }
    emailAlerts.mutate(items, {
      onSuccess: ({ to }) => toast.success(`Alerts digest emailed to ${to}.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send email."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Notifications › Alerts"
        title="Alerts Dashboard"
        description="Alerts overview and controls."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={emailAlerts.isPending}
            onClick={handleEmail}
          >
            <Mail className="h-4 w-4" />
            {emailAlerts.isPending ? "Sending…" : "Email to Admin"}
          </Button>
        }
      />

      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "cursor-pointer border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors",
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
