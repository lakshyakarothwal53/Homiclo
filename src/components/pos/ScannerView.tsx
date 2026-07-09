import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScannerView({
  icon: Icon,
  label,
  instruction,
}: {
  icon: LucideIcon;
  label: string;
  instruction: string;
}) {
  const [scanning, setScanning] = useState(false);

  return (
    <Card className="border-border p-8 sm:p-12">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand">
          <Icon className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">{label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{instruction}</p>

        <div
          className={cn(
            "mt-8 grid h-48 w-full place-items-center rounded-xl border-2 border-dashed text-sm",
            scanning
              ? "border-brand/50 bg-[color-mix(in_oklab,var(--brand)_6%,transparent)] text-brand"
              : "border-border text-muted-foreground",
          )}
        >
          {scanning ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              Scanning…
            </span>
          ) : (
            "Live camera feed"
          )}
        </div>

        <Button
          className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => {
            setScanning((s) => {
              const next = !s;
              toast[next ? "info" : "message"](
                next ? "Camera started — point at a code" : "Scanning stopped",
              );
              return next;
            });
          }}
        >
          {scanning ? "Stop Scanning" : "Start Scanning"}
        </Button>
      </div>
    </Card>
  );
}
