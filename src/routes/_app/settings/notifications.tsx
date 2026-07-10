import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSetting, useSaveAppSetting } from "@/hooks/use-settings";

export const Route = createFileRoute("/_app/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Settings — HOMIQLO" },
      { name: "description", content: "Notifications overview and controls." },
    ],
  }),
  component: Page,
});

type Channels = { email: boolean; push: boolean; sms: boolean };

type NotificationSettings = {
  adminEmail: string;
  rules: Record<string, Channels>;
};

const RULE_DEFS: { id: string; title: string; description: string }[] = [
  {
    id: "low-stock",
    title: "Low stock alerts",
    description: "When stock falls below minimum level",
  },
  {
    id: "late-arrivals",
    title: "Late arrivals",
    description: "When an employee is late by more than threshold",
  },
  {
    id: "payment-received",
    title: "Payment received",
    description: "When a customer pays an invoice",
  },
  {
    id: "payment-failed",
    title: "Payment failed",
    description: "When a gateway payment fails",
  },
  {
    id: "daily-summary",
    title: "Daily sales summary",
    description: "Daily summary at end of business hours",
  },
  {
    id: "new-employee",
    title: "New employee added",
    description: "When a new employee record is created",
  },
];

const CHANNELS: { key: keyof Channels; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "push", label: "Push" },
  { key: "sms", label: "SMS" },
];

const DEFAULT_CHANNELS: Channels = { email: true, push: true, sms: false };

const DEFAULTS: NotificationSettings = {
  adminEmail: "piyush.novavision@gmail.com",
  rules: Object.fromEntries(RULE_DEFS.map((r) => [r.id, { ...DEFAULT_CHANNELS }])),
};

function Page() {
  const { data: saved, isLoading } = useAppSetting<NotificationSettings>("notifications");
  const save = useSaveAppSetting<NotificationSettings>("notifications");
  const [form, setForm] = useState<NotificationSettings>(DEFAULTS);

  useEffect(() => {
    if (saved) {
      setForm({
        adminEmail: saved.adminEmail ?? DEFAULTS.adminEmail,
        rules: { ...DEFAULTS.rules, ...saved.rules },
      });
    }
  }, [saved]);

  function toggle(ruleId: string, channel: keyof Channels, checked: boolean) {
    setForm((f) => ({
      ...f,
      rules: {
        ...f.rules,
        [ruleId]: { ...(f.rules[ruleId] ?? DEFAULT_CHANNELS), [channel]: checked },
      },
    }));
  }

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
            save.mutate(form, {
              onSuccess: () =>
                toast.success(`Notification preferences saved — alerts go to ${form.adminEmail}.`),
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Could not save preferences."),
            });
          }}
        >
          <div className="mb-6 max-w-md space-y-2">
            <Label htmlFor="admin-email">Super Admin Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Alert digests from Notifications › Alerts Dashboard are emailed here.
            </p>
          </div>

          <h3 className="text-sm font-semibold text-foreground">Notify me when…</h3>

          <div className="mt-4 space-y-3">
            {RULE_DEFS.map((rule) => {
              const channels = form.rules[rule.id] ?? DEFAULT_CHANNELS;
              return (
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
                        <Checkbox
                          id={`${rule.id}-${ch.key}`}
                          checked={channels[ch.key]}
                          onCheckedChange={(checked) => toggle(rule.id, ch.key, checked === true)}
                        />
                        {ch.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end">
            <Button
              type="submit"
              disabled={isLoading || save.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {save.isPending ? "Saving…" : "Save Preferences"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
