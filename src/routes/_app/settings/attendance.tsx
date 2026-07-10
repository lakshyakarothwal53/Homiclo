import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useAttendanceSettings,
  useShiftConfigs,
  useUpdateAttendanceSetting,
  useUpdateShiftConfig,
} from "@/hooks/use-attendance";
import type { AttendanceSetting } from "@/types/attendance";

export const Route = createFileRoute("/_app/settings/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Settings — HOMIQLO" },
      { name: "description", content: "Settings overview and controls." },
    ],
  }),
  component: Page,
});

// "09:00 AM" ↔ "09:00" (input type=time)
function to24h(t: string): string {
  const m = t?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return t ?? "";
  let h = parseInt(m[1], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function to12h(t: string): string {
  const m = t?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t ?? "";
  let h = parseInt(m[1], 10);
  const mer = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m[2]} ${mer}`;
}

function Page() {
  const { data: settings = [], isLoading: settingsLoading } = useAttendanceSettings();
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftConfigs();
  const updateSetting = useUpdateAttendanceSetting();
  const updateShift = useUpdateShiftConfig();

  const shift = shifts[0];
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shift) {
      setStartTime(to24h(shift.startTime));
      setEndTime(to24h(shift.endTime));
    }
  }, [shift]);

  useEffect(() => {
    if (settings.length > 0) {
      setValues(Object.fromEntries(settings.map((s) => [s.id, s.value])));
    }
  }, [settings]);

  const booleans = settings.filter((s) => s.type === "boolean");
  const numerics = settings.filter((s) => s.type !== "boolean");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updates: Promise<unknown>[] = [];
      if (shift) {
        updates.push(
          updateShift.mutateAsync({
            ...shift,
            startTime: to12h(startTime),
            endTime: to12h(endTime),
          }),
        );
      }
      for (const s of settings) {
        if (values[s.id] !== undefined && values[s.id] !== s.value) {
          updates.push(updateSetting.mutateAsync({ ...s, value: values[s.id] }));
        }
      }
      await Promise.all(updates);
      toast.success("Attendance settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  function resetForm() {
    if (shift) {
      setStartTime(to24h(shift.startTime));
      setEndTime(to24h(shift.endTime));
    }
    setValues(Object.fromEntries(settings.map((s) => [s.id, s.value])));
    toast.info("Changes discarded.");
  }

  const numericField = (s: AttendanceSetting) => (
    <div key={s.id} className="space-y-2">
      <Label htmlFor={`as-${s.id}`}>{s.name}</Label>
      <Input
        id={`as-${s.id}`}
        type="number"
        min={0}
        value={values[s.id] ?? s.value}
        onChange={(e) => setValues((v) => ({ ...v, [s.id]: e.target.value }))}
      />
      <p className="text-xs text-muted-foreground">{s.description}</p>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Settings"
        title="Attendance Settings"
        description="Settings overview and controls."
      />

      <Card className="border-border p-6">
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">
                Office Start Time{shift ? ` (${shift.shiftName})` : ""}
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Office End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            {numerics.map(numericField)}
          </div>

          <div className="mt-6 space-y-3">
            <Label>Verification Methods</Label>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {booleans.map((s) => (
                <label
                  key={s.id}
                  htmlFor={`as-${s.id}`}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                  title={s.description}
                >
                  <Checkbox
                    id={`as-${s.id}`}
                    checked={(values[s.id] ?? s.value) === "true"}
                    onCheckedChange={(checked) =>
                      setValues((v) => ({ ...v, [s.id]: checked === true ? "true" : "false" }))
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                settingsLoading || shiftsLoading || updateSetting.isPending || updateShift.isPending
              }
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {updateSetting.isPending || updateShift.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
