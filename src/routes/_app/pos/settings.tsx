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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePosSettings, useSavePosSettings } from "@/hooks/use-pos";
import type { PosSettings } from "@/types/pos";

export const Route = createFileRoute("/_app/pos/settings")({
  head: () => ({
    meta: [
      { title: "POS Settings — HOMIQLO" },
      { name: "description", content: "Settings overview and controls." },
    ],
  }),
  component: Page,
});

function Page() {
  const { settings, isLoading } = usePosSettings();
  const save = useSavePosSettings();
  const [form, setForm] = useState<PosSettings>(settings);

  // Re-seed the form once the saved settings load.
  useEffect(() => {
    if (!isLoading) setForm(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  function set<K extends keyof PosSettings>(key: K, value: PosSettings[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(form, {
      onSuccess: () => toast.success("POS settings saved"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="POS › Settings"
        title="POS Settings"
        description="Tax, receipt and printer configuration for the cashier till."
      />

      <Card className="border-border p-6">
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gst">Default Tax (GST %)</Label>
              <Input
                id="gst"
                type="number"
                value={form.gstRate}
                min={0}
                max={100}
                onChange={(e) => set("gstRate", Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store">Store Name (on receipt)</Label>
              <Input
                id="store"
                value={form.storeName}
                onChange={(e) => set("storeName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN (on receipt)</Label>
              <Input
                id="gstin"
                value={form.gstin}
                placeholder="27ABCDE1234F1Z5"
                onChange={(e) => set("gstin", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Store Address (on receipt)</Label>
              <Input
                id="address"
                value={form.storeAddress}
                onChange={(e) => set("storeAddress", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Receipt Footer Text</Label>
              <Input
                id="footer"
                value={form.receiptFooter}
                onChange={(e) => set("receiptFooter", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt Paper Width</Label>
              <Select
                value={form.paperWidth}
                onValueChange={(v) => set("paperWidth", v as PosSettings["paperWidth"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80mm (3-inch)</SelectItem>
                  <SelectItem value="58mm">58mm (2-inch)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <label
              htmlFor="auto-print"
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                id="auto-print"
                checked={form.autoPrint}
                onCheckedChange={(c) => set("autoPrint", c === true)}
              />
              Auto-print receipt after payment
            </label>
            <p className="text-xs text-muted-foreground">
              For silent printing on the DCode printer, set it as the default printer and launch
              Chrome with <code>--kiosk-printing</code>. Otherwise a print dialog opens per sale.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="submit"
              disabled={save.isPending}
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
