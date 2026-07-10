import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSetting, useSaveAppSetting } from "@/hooks/use-settings";

export const Route = createFileRoute("/_app/settings/company")({
  head: () => ({
    meta: [
      { title: "Company Settings — HOMIQLO" },
      { name: "description", content: "Company overview and controls." },
    ],
  }),
  component: Page,
});

const CURRENCIES = [
  { value: "INR", label: "INR ₹" },
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
  { value: "GBP", label: "GBP £" },
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
];

type CompanySettings = {
  name: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
};

const DEFAULTS: CompanySettings = {
  name: "Nexus Retail Pvt Ltd",
  gstin: "27ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  email: "hello@nexusretail.in",
  phone: "+91 22 4000 1234",
  address: "Plot 12, Andheri MIDC, Mumbai 400093",
  currency: "INR",
  timezone: "Asia/Kolkata",
};

function Page() {
  const { data: saved, isLoading } = useAppSetting<CompanySettings>("company");
  const save = useSaveAppSetting<CompanySettings>("company");
  const [form, setForm] = useState<CompanySettings>(DEFAULTS);

  useEffect(() => {
    if (saved) setForm({ ...DEFAULTS, ...saved });
  }, [saved]);

  const set = (patch: Partial<CompanySettings>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader
        eyebrow="Settings › Company"
        title="Company Settings"
        description="Company overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form, {
              onSuccess: () => toast.success("Company settings saved."),
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Could not save settings."),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(e) => set({ gstin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" value={form.pan} onChange={(e) => set({ pan: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Registered Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => set({ currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={form.timezone} onValueChange={(v) => set({ timezone: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(saved ? { ...DEFAULTS, ...saved } : DEFAULTS);
                toast.info("Changes discarded.");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || save.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {save.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
