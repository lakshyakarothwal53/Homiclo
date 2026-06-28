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

function Page() {
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
            toast.success("System preferences saved");
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select defaultValue="English">
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
              <Select defaultValue="DD/MM/YYYY">
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
              <Select defaultValue="Light">
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
              <Input id="session-timeout" type="number" min={1} defaultValue={30} />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Label>Backup</Label>
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Automatic Daily Backup</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Last backup: Today, 03:00 AM · 124 MB
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("Backup started…")}
                >
                  Backup Now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={() => toast.info("Restore from latest backup…")}
                >
                  Restore
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
              Save
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
