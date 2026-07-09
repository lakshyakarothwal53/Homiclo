import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_app/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Settings — HOMIQLO" },
      { name: "description", content: "Notifications overview and controls." },
    ],
  }),
  component: Page,
});

type NotificationRule = {
  id: string;
  title: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
};

const RULES: NotificationRule[] = [
  {
    id: "low-stock",
    title: "Low stock alerts",
    description: "When stock falls below minimum level",
    email: true,
    push: true,
    sms: false,
  },
  {
    id: "late-arrivals",
    title: "Late arrivals",
    description: "When an employee is late by more than threshold",
    email: true,
    push: true,
    sms: false,
  },
  {
    id: "payment-received",
    title: "Payment received",
    description: "When a customer pays an invoice",
    email: true,
    push: true,
    sms: false,
  },
  {
    id: "payment-failed",
    title: "Payment failed",
    description: "When a gateway payment fails",
    email: true,
    push: true,
    sms: false,
  },
  {
    id: "daily-summary",
    title: "Daily sales summary",
    description: "Daily summary at end of business hours",
    email: true,
    push: true,
    sms: false,
  },
  {
    id: "new-employee",
    title: "New employee added",
    description: "When a new employee record is created",
    email: true,
    push: true,
    sms: false,
  },
];

const CHANNELS: { key: "email" | "push" | "sms"; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "push", label: "Push" },
  { key: "sms", label: "SMS" },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Settings › Notifications"
        title="Notification Settings"
        description="Notifications overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Notification preferences saved");
          }}
        >
          <h3 className="text-sm font-semibold text-foreground">Notify me when…</h3>

          <div className="mt-4 space-y-3">
            {RULES.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{rule.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  {CHANNELS.map((ch) => (
                    <label
                      key={ch.key}
                      htmlFor={`${rule.id}-${ch.key}`}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox id={`${rule.id}-${ch.key}`} defaultChecked={rule[ch.key]} />
                      {ch.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end">
            <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
