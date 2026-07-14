import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppSetting, useSaveAppSetting } from "@/hooks/use-settings";

export const Route = createFileRoute("/_app/settings/payment-gateway")({
  head: () => ({
    meta: [
      { title: "Payment Gateway — HOMIQLO" },
      { name: "description", content: "Gateway overview and controls." },
    ],
  }),
  component: Page,
});

// Which gateway integrations this Settings page offers — a fixed UI option
// list (like CURRENCIES/LANGUAGES elsewhere), not data. Whether each one is
// actually configured comes from the saved apiKey/secretKey below.
const GATEWAY_OPTIONS = [
  { id: "razorpay", name: "Razorpay", subtitle: "Credit/Debit Card, UPI, Net Banking" },
  { id: "phonepe", name: "PhonePe", subtitle: "UPI & Wallets" },
  { id: "paytm", name: "Paytm", subtitle: "UPI & Wallets" },
  { id: "stripe", name: "Stripe", subtitle: "International cards" },
] as const;

type GatewayCreds = { apiKey: string; secretKey: string };
type PaymentGatewaySettings = Record<string, GatewayCreds>;

const EMPTY_CREDS: GatewayCreds = { apiKey: "", secretKey: "" };

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
      <span className={cn(connected && "text-emerald-600")}>
        {connected ? "Connected" : "Not Connected"}
      </span>
    </span>
  );
}

function GatewayCard({
  gateway,
  creds,
  onSave,
}: {
  gateway: (typeof GATEWAY_OPTIONS)[number];
  creds: GatewayCreds;
  onSave: (creds: GatewayCreds) => void;
}) {
  const [apiKey, setApiKey] = useState(creds.apiKey);
  const [secretKey, setSecretKey] = useState(creds.secretKey);

  useEffect(() => {
    setApiKey(creds.apiKey);
    setSecretKey(creds.secretKey);
  }, [creds]);

  const connected = !!creds.apiKey && !!creds.secretKey;

  return (
    <Card className="border-border p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ apiKey: apiKey.trim(), secretKey: secretKey.trim() });
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{gateway.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{gateway.subtitle}</p>
          </div>
          <StatusPill connected={connected} />
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${gateway.id}-key`}>API Key</Label>
            <Input
              id={`${gateway.id}-key`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Not configured"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${gateway.id}-secret`}>Secret Key</Label>
            <Input
              id={`${gateway.id}-secret`}
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Not configured"
              autoComplete="off"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="sm"
          className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          Save
        </Button>
      </form>
    </Card>
  );
}

function Page() {
  const { data: saved } = useAppSetting<PaymentGatewaySettings>("payment-gateway");
  const save = useSaveAppSetting<PaymentGatewaySettings>("payment-gateway");

  function handleSave(gatewayId: string, gatewayName: string, creds: GatewayCreds) {
    const next: PaymentGatewaySettings = { ...(saved ?? {}), [gatewayId]: creds };
    save.mutate(next, {
      onSuccess: () => toast.success(`${gatewayName} settings saved`),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Could not save gateway settings."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings › Gateway"
        title="Payment Gateway Settings"
        description="Gateway overview and controls."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {GATEWAY_OPTIONS.map((g) => (
          <GatewayCard
            key={g.id}
            gateway={g}
            creds={saved?.[g.id] ?? EMPTY_CREDS}
            onSave={(creds) => handleSave(g.id, g.name, creds)}
          />
        ))}
      </div>
    </>
  );
}
