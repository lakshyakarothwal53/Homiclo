import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_app/settings/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Settings — HOMIQLO" },
      { name: "description", content: "Settings overview and controls." },
    ],
  }),
  component: Page,
});

const VERIFICATION_METHODS = [
  { id: "photo", label: "Photo verification", defaultChecked: true },
  { id: "gps", label: "GPS location", defaultChecked: true },
  { id: "biometric", label: "Biometric", defaultChecked: false },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Attendance › Settings"
        title="Attendance Settings"
        description="Settings overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Attendance settings saved");
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Office Start Time</Label>
              <Input id="start-time" type="time" defaultValue="09:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Office End Time</Label>
              <Input id="end-time" type="time" defaultValue="18:00" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
              <Input id="late-threshold" type="number" min={0} defaultValue={15} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="halfday-threshold">Half-day Threshold (hours)</Label>
              <Input id="halfday-threshold" type="number" min={0} defaultValue={4} />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="geo-radius">Geo-fence Radius (meters)</Label>
            <Input id="geo-radius" type="number" min={0} defaultValue={100} />
            <p className="text-xs text-muted-foreground">
              Employees must check in within this radius of the office location.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Label>Verification Methods</Label>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {VERIFICATION_METHODS.map((m) => (
                <label
                  key={m.id}
                  htmlFor={m.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox id={m.id} defaultChecked={m.defaultChecked} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
              Save Settings
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
