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

export const Route = createFileRoute("/_app/pos/settings")({
  head: () => ({
    meta: [
      { title: "POS Settings — HOMIQLO" },
      { name: "description", content: "Settings overview and controls." },
    ],
  }),
  component: Page,
});

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Wallet"];
const PRINTERS = ["Epson TM-T82 (USB)", "TVS RP 3200 (USB)", "Browser / PDF", "No printer"];

const FEATURES = [
  { id: "auto-print", label: "Auto-print receipt", defaultChecked: true },
  { id: "customer-name", label: "Allow customer name on bill", defaultChecked: true },
  { id: "round-off", label: "Round off totals", defaultChecked: false },
  { id: "show-stock", label: "Show stock on POS", defaultChecked: true },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="POS › Settings"
        title="POS Settings"
        description="Settings overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("POS settings saved");
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gst">Default Tax (GST %)</Label>
              <Input id="gst" type="number" defaultValue={18} min={0} max={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Receipt Footer Text</Label>
              <Input id="footer" defaultValue="Thank you for shopping!" />
            </div>

            <div className="space-y-2">
              <Label>Default Payment Mode</Label>
              <Select defaultValue="Cash">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Receipt Printer</Label>
              <Select defaultValue={PRINTERS[0]}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINTERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Label>Features</Label>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {FEATURES.map((f) => (
                <label
                  key={f.id}
                  htmlFor={f.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox id={f.id} defaultChecked={f.defaultChecked} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline">
              Cancel
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
