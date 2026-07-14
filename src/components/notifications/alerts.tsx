import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Alert rows are derived live from module tables — see src/hooks/use-notifications.ts.

export type AlertCategory = "stock" | "attendance" | "payment" | "system";
export type Tone = "danger" | "warning" | "success" | "info" | "brand";

export type AlertItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: Tone;
  icon: LucideIcon;
  category: AlertCategory;
};

const TONE_STYLES: Record<Tone, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-[color:var(--warning)]",
  success: "bg-success/10 text-[color:var(--success)]",
  info: "bg-info/10 text-[color:var(--info)]",
  brand: "bg-brand/10 text-brand",
};

export function AlertList({ items }: { items: AlertItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No alerts to show here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const Icon = a.icon;
        return (
          <Card key={a.id} className="border-border shadow-sm">
            <CardContent className="flex items-start gap-4 p-4">
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  TONE_STYLES[a.tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
