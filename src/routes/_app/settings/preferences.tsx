import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSetting, useSaveAppSetting } from "@/hooks/use-settings";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/settings/preferences")({
  head: () => ({
    meta: [
      { title: "System Preferences — HOMIQLO" },
      { name: "description", content: "System overview and controls." },
    ],
  }),
  component: Page,
});

const LANGUAGES = ["English", "Hindi", "Marathi", "Tamil"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const THEMES = ["Light", "Dark", "System"];

type Preferences = {
  language: string;
  dateFormat: string;
  theme: string;
  sessionTimeout: number;
};

const DEFAULTS: Preferences = {
  language: "English",
  dateFormat: "DD/MM/YYYY",
  theme: "Light",
  sessionTimeout: 30,
};

const BACKUP_TABLES = [
  "products",
  "categories",
  "employees",
  "billing_sales_bills",
  "billing_payments",
  "billing_refunds",
  "billing_tax_invoices",
  "discount_promos",
  "discount_usage",
  "daily_logs",
  "employee_checkins",
  "pos_transactions",
  "roles",
];

const LAST_BACKUP_KEY = "homiqlo_last_backup";

function Page() {
  const { data: saved, isLoading } = useAppSetting<Preferences>("preferences");
  const save = useSaveAppSetting<Preferences>("preferences");
  const [form, setForm] = useState<Preferences>(DEFAULTS);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    if (saved) setForm({ ...DEFAULTS, ...saved });
  }, [saved]);

  useEffect(() => {
    setLastBackup(localStorage.getItem(LAST_BACKUP_KEY));
  }, []);

  const set = (patch: Partial<Preferences>) => setForm((f) => ({ ...f, ...patch }));

  async function handleBackup() {
    setBackingUp(true);
    try {
      const dump: Record<string, unknown[]> = {};
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table).select("*");
        if (!error && data) dump[table] = data;
      }
      const json = JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `homiqlo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const stamp = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      localStorage.setItem(LAST_BACKUP_KEY, stamp);
      setLastBackup(stamp);
      toast.success(`Backup downloaded (${Object.keys(dump).length} tables).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings › System"
        title="System Preferences"
        description="System overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form, {
              onSuccess: () => toast.success("System preferences saved."),
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Could not save preferences."),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => set({ language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={form.dateFormat} onValueChange={(v) => set({ dateFormat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Theme</Label>
              <Select value={form.theme} onValueChange={(v) => set({ theme: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                min={1}
                value={form.sessionTimeout}
                onChange={(e) => set({ sessionTimeout: Number(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Label>Backup</Label>
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Download Data Backup</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {lastBackup
                    ? `Last backup: ${lastBackup}`
                    : "No backup taken from this device yet."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={backingUp}
                onClick={handleBackup}
              >
                {backingUp ? "Backing up…" : "Backup Now"}
              </Button>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="submit"
              disabled={isLoading || save.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
