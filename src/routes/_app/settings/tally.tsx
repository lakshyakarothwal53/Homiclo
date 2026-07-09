import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/settings/tally")({
  head: () => ({
    meta: [
      { title: "Tally Configuration — HOMIQLO" },
      { name: "description", content: "Tally overview and controls." },
    ],
  }),
  component: Page,
});

const SYNC_FREQUENCIES = [
  "Every 5 minutes",
  "Every 15 minutes",
  "Every 30 minutes",
  "Every hour",
  "Manual only",
];

const VOUCHER_MAPPINGS = [
  { id: "sales", label: "Sales → Sales Voucher", defaultChecked: true },
  { id: "receipt", label: "Receipt → Receipt Voucher", defaultChecked: true },
  { id: "purchase", label: "Purchase → Purchase Voucher", defaultChecked: true },
  { id: "stock-journal", label: "Stock Journal", defaultChecked: false },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Settings › Tally"
        title="Tally Configuration"
        description="Tally overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Tally configuration saved");
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="server-ip">Tally Server IP</Label>
              <Input id="server-ip" defaultValue="192.168.1.10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input id="port" defaultValue="9000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tally-company">Company Name in Tally</Label>
              <Input id="tally-company" defaultValue="Nexus Retail Pvt Ltd" />
            </div>
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select defaultValue="Every 5 minutes">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Label>Voucher Mappings</Label>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {VOUCHER_MAPPINGS.map((m) => (
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
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Testing connection to Tally…")}
            >
              Test Connection
            </Button>
            <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
              Save
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
