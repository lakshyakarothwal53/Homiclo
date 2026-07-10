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
import { useAppSetting, useSaveAppSetting } from "@/hooks/use-settings";
import { DEFAULT_TALLY_CONFIG, testTallyConnection, type TallyConfig } from "@/lib/tally";

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

const VOUCHER_MAPPINGS: { id: keyof TallyConfig["vouchers"]; label: string }[] = [
  { id: "sales", label: "Sales → Sales Voucher" },
  { id: "receipt", label: "Receipt → Receipt Voucher" },
  { id: "purchase", label: "Purchase → Purchase Voucher" },
  { id: "stockJournal", label: "Stock Journal" },
];

function Page() {
  const { data: saved, isLoading } = useAppSetting<TallyConfig>("tally");
  const save = useSaveAppSetting<TallyConfig>("tally");
  const [form, setForm] = useState<TallyConfig>(DEFAULT_TALLY_CONFIG);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (saved) {
      setForm({
        ...DEFAULT_TALLY_CONFIG,
        ...saved,
        vouchers: { ...DEFAULT_TALLY_CONFIG.vouchers, ...saved.vouchers },
      });
    }
  }, [saved]);

  const set = (patch: Partial<TallyConfig>) => setForm((f) => ({ ...f, ...patch }));

  async function handleTest() {
    setTesting(true);
    toast.loading(`Testing http://${form.serverIp}:${form.port}…`, { id: "tally-test" });
    const ok = await testTallyConnection(form);
    setTesting(false);
    if (ok) {
      toast.success("Tally server reachable.", { id: "tally-test" });
    } else {
      toast.error(
        "Could not reach the Tally server — check the IP/port and that Tally's HTTP gateway is on.",
        { id: "tally-test" },
      );
    }
  }

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
            save.mutate(form, {
              onSuccess: () => toast.success("Tally configuration saved."),
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Could not save configuration."),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="server-ip">Tally Server IP</Label>
              <Input
                id="server-ip"
                value={form.serverIp}
                onChange={(e) => set({ serverIp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input id="port" value={form.port} onChange={(e) => set({ port: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tally-company">Company Name in Tally</Label>
              <Input
                id="tally-company"
                value={form.company}
                onChange={(e) => set({ company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select value={form.syncFrequency} onValueChange={(v) => set({ syncFrequency: v })}>
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
                  <Checkbox
                    id={m.id}
                    checked={form.vouchers[m.id]}
                    onCheckedChange={(checked) =>
                      set({ vouchers: { ...form.vouchers, [m.id]: checked === true } })
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" disabled={testing} onClick={handleTest}>
              {testing ? "Testing…" : "Test Connection"}
            </Button>
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
