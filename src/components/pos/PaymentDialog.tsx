import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/components/pos/products";
import { checkUpiStatus, createUpiQr } from "@/hooks/use-pos";

type PaymentResult = { paymentMode: string; upiRef?: string };

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  invoice,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  invoice: string;
  onPaid: (result: PaymentResult) => void;
}) {
  const [mode, setMode] = useState("UPI");
  const [qr, setQr] = useState<{ qrId: string; imageUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setWaiting(false);
  }

  // Reset everything whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      stopPolling();
      setQr(null);
      setGenerating(false);
      setMode("UPI");
    }
    return stopPolling;
  }, [open]);

  async function generateQr() {
    setGenerating(true);
    try {
      const created = await createUpiQr(total, invoice);
      setQr(created);
      setWaiting(true);
      pollRef.current = setInterval(async () => {
        try {
          const { paid, paymentRef } = await checkUpiStatus(created.qrId);
          if (paid) {
            stopPolling();
            onPaid({ paymentMode: "UPI", upiRef: paymentRef });
          }
        } catch {
          /* transient — keep polling */
        }
      }, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create UPI QR.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>
            Amount due <span className="font-semibold text-foreground">{formatINR(total)}</span> ·{" "}
            {invoice}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={mode} onValueChange={setMode} disabled={waiting}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UPI">UPI (QR on screen)</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
            </SelectContent>
          </Select>

          {mode === "UPI" ? (
            <div className="flex flex-col items-center gap-3">
              {qr ? (
                <>
                  <img
                    src={qr.imageUrl}
                    alt="UPI QR"
                    className="h-52 w-52 rounded-lg border border-border"
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…
                  </div>
                </>
              ) : (
                <Button
                  className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={generateQr}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  Generate UPI QR
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => onPaid({ paymentMode: "UPI", upiRef: undefined })}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark as Paid manually
              </Button>
            </div>
          ) : (
            <Button
              className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => onPaid({ paymentMode: mode, upiRef: undefined })}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm {mode} Payment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
