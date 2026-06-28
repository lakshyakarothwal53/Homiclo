import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings/payment-gateway")({
  head: () => ({
    meta: [
      { title: "Payment Gateway — HOMIQLO" },
      { name: "description", content: "Gateway overview and controls." },
    ],
  }),
  component: Page,
});

type Gateway = {
  id: string;
  name: string;
  subtitle: string;
  connected: boolean;
};

const GATEWAYS: Gateway[] = [
  { id: "razorpay", name: "Razorpay", subtitle: "Credit/Debit Card, UPI, Net Banking", connected: true },
  { id: "phonepe", name: "PhonePe", subtitle: "UPI & Wallets", connected: true },
  { id: "paytm", name: "Paytm", subtitle: "UPI & Wallets", connected: false },
  { id: "stripe", name: "Stripe", subtitle: "International cards", connected: false },
];

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

function GatewayCard({ gateway }: { gateway: Gateway }) {
  return (
    <Card className="border-border p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(`${gateway.name} settings saved`);
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{gateway.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{gateway.subtitle}</p>
          </div>
          <StatusPill connected={gateway.connected} />
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${gateway.id}-key`}>API Key</Label>
            <Input
              id={`${gateway.id}-key`}
              type="password"
              defaultValue="••••••••••••"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${gateway.id}-secret`}>Secret Key</Label>
            <Input
              id={`${gateway.id}-secret`}
              type="password"
              defaultValue="••••••••••••"
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
  return (
    <>
      <PageHeader
        eyebrow="Settings › Gateway"
        title="Payment Gateway Settings"
        description="Gateway overview and controls."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {GATEWAYS.map((g) => (
          <GatewayCard key={g.id} gateway={g} />
        ))}
      </div>
    </>
  );
}
