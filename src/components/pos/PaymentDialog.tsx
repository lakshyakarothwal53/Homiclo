import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/components/pos/products";
import { checkUpiStatus, createUpiQr } from "@/hooks/use-pos";
import { fetchCustomerByMobile } from "@/hooks/use-customers";
import { localDateIso } from "@/lib/utils";
import type { PaymentResult, PosCustomer } from "@/types/pos";

const EMPTY_CUSTOMER: PosCustomer = {
  name: "",
  mobile: "",
  dob: "",
  invoiceDate: localDateIso(),
  gstin: "",
};

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
  const [step, setStep] = useState<"customer" | "payment">("customer");
  const [customer, setCustomer] = useState<PosCustomer>(EMPTY_CUSTOMER);
  const [mode, setMode] = useState("UPI");
  // Per-method rupee amounts for a "Part Payment" (split tender).
  const [split, setSplit] = useState({ cash: 0, card: 0, upi: 0 });
  const [qr, setQr] = useState<{ qrId: string; imageUrl: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [debouncedMobile, setDebouncedMobile] = useState("");
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
      setSplit({ cash: 0, card: 0, upi: 0 });
      setStep("customer");
      setCustomer({ ...EMPTY_CUSTOMER, invoiceDate: localDateIso() });
      setDebouncedMobile("");
    }
    return stopPolling;
  }, [open]);

  function setField<K extends keyof PosCustomer>(key: K, value: PosCustomer[K]) {
    setCustomer((c) => ({ ...c, [key]: value }));
  }

  // Look up the mobile number once it's a complete 10-digit entry — debounced
  // so a lookup doesn't fire on every keystroke while typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedMobile(customer.mobile.length === 10 ? customer.mobile : "");
    }, 400);
    return () => clearTimeout(t);
  }, [customer.mobile]);

  const { data: foundCustomer, isFetching: lookingUpCustomer } = useQuery({
    queryKey: ["pos", "customer-lookup", debouncedMobile],
    queryFn: () => fetchCustomerByMobile(debouncedMobile),
    enabled: debouncedMobile.length === 10,
  });

  // An already-registered customer's saved details take over the rest of the
  // form the moment their mobile number resolves — the cashier only needs to
  // confirm/edit, not re-type a return customer's name, DOB, and GSTIN.
  useEffect(() => {
    if (!foundCustomer) return;
    setCustomer((c) => ({
      ...c,
      name: foundCustomer.name || c.name,
      dob: foundCustomer.dob || c.dob,
      gstin: foundCustomer.gst || c.gstin,
    }));
    toast.success(`Existing customer found — details filled in for ${foundCustomer.name}.`);
  }, [foundCustomer]);

  function continueToPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!customer.name.trim()) return toast.error("Customer name is required.");
    if (!/^\d{10}$/.test(customer.mobile.trim()))
      return toast.error("Enter a valid 10-digit mobile number.");
    if (!customer.dob) return toast.error("Date of birth is required.");
    if (!customer.invoiceDate) return toast.error("Invoice date is required.");
    setStep("payment");
  }

  function completePayment(result: Omit<PaymentResult, "customer">) {
    onPaid({
      ...result,
      customer: { ...customer, name: customer.name.trim(), mobile: customer.mobile.trim() },
    });
  }

  // `amount` lets a Part Payment generate a QR for just its UPI slice, and
  // `paymentModeLabel` is what gets recorded once that QR is paid.
  async function generateQr(amount: number, paymentModeLabel: string) {
    setGenerating(true);
    try {
      const created = await createUpiQr(amount, invoice);
      setQr(created);
      setWaiting(true);
      pollRef.current = setInterval(async () => {
        try {
          const { paid, paymentRef } = await checkUpiStatus(created.qrId);
          if (paid) {
            stopPolling();
            completePayment({ paymentMode: paymentModeLabel, upiRef: paymentRef });
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

  // Switching method mid-flow drops any pending QR/poll so it can't complete
  // against the wrong tender.
  function handleModeChange(next: string) {
    stopPolling();
    setQr(null);
    setMode(next);
  }

  const splitTotal = split.cash + split.card + split.upi;
  const splitRemaining = total - splitTotal;

  function setSplitAmount(key: "cash" | "card" | "upi", value: string) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setSplit((s) => ({ ...s, [key]: n }));
  }

  // "Part — Cash ₹300, Card ₹300" — only the methods actually used.
  function buildPartLabel() {
    const parts: string[] = [];
    if (split.cash > 0) parts.push(`Cash ${formatINR(split.cash)}`);
    if (split.card > 0) parts.push(`Card ${formatINR(split.card)}`);
    if (split.upi > 0) parts.push(`UPI ${formatINR(split.upi)}`);
    return `Part — ${parts.join(", ")}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{step === "customer" ? "Customer Details" : "Collect Payment"}</DialogTitle>
          <DialogDescription>
            Amount due <span className="font-semibold text-foreground">{formatINR(total)}</span> ·{" "}
            {invoice}
          </DialogDescription>
        </DialogHeader>

        {step === "customer" ? (
          <form className="space-y-3" onSubmit={continueToPayment}>
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">
                Customer Name <span className="text-brand">*</span>
              </Label>
              <Input
                id="cust-name"
                value={customer.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-mobile">
                Mobile Number <span className="text-brand">*</span>
              </Label>
              <Input
                id="cust-mobile"
                inputMode="numeric"
                value={customer.mobile}
                onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile"
              />
              {customer.mobile.length === 10 &&
                (debouncedMobile !== customer.mobile || lookingUpCustomer ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking for an existing customer…
                  </p>
                ) : foundCustomer ? (
                  <p className="flex items-center gap-1 text-xs text-[color:var(--success)]">
                    <CheckCircle2 className="h-3 w-3" /> Existing customer — details filled in.
                  </p>
                ) : null)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cust-dob">
                  Date of Birth <span className="text-brand">*</span>
                </Label>
                <Input
                  id="cust-dob"
                  type="date"
                  value={customer.dob}
                  max={localDateIso()}
                  onChange={(e) => setField("dob", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-invoice-date">
                  Invoice Date <span className="text-brand">*</span>
                </Label>
                <Input
                  id="cust-invoice-date"
                  type="date"
                  value={customer.invoiceDate}
                  onChange={(e) => setField("invoiceDate", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-gstin">GST Number (optional)</Label>
              <Input
                id="cust-gstin"
                value={customer.gstin}
                onChange={(e) => setField("gstin", e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
              />
            </div>
            <Button
              type="submit"
              className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Continue to Payment <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("customer")}
              disabled={waiting}
              className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-brand disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {customer.name || "Customer"}
            </button>

            <Select value={mode} onValueChange={handleModeChange} disabled={waiting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPI">UPI (QR on screen)</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Part Payment">Part Payment (split)</SelectItem>
              </SelectContent>
            </Select>

            {mode === "UPI" ? (
              <div className="flex flex-col items-center gap-3">
                {qr ? (
                  <>
                    <img
                      src={qr.imageUrl}
                      alt="UPI QR"
                      className="h-80 w-80 max-w-full rounded-lg border border-border bg-white object-contain p-2"
                    />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…
                    </div>
                  </>
                ) : (
                  <Button
                    className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                    onClick={() => generateQr(total, "UPI")}
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
                  onClick={() => completePayment({ paymentMode: "UPI", upiRef: undefined })}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark as Paid manually
                </Button>
              </div>
            ) : mode === "Part Payment" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {(["cash", "card", "upi"] as const).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <Label htmlFor={`split-${k}`}>{k === "upi" ? "UPI" : k[0].toUpperCase() + k.slice(1)}</Label>
                      <Input
                        id={`split-${k}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={split[k] || ""}
                        onChange={(e) => setSplitAmount(k, e.target.value)}
                        disabled={waiting}
                        placeholder="0"
                        className="max-w-[140px]"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-muted-foreground">
                      Entered {formatINR(splitTotal)} of {formatINR(total)}
                    </span>
                    <span
                      className={
                        splitRemaining === 0 ? "text-[color:var(--success)]" : "text-brand"
                      }
                    >
                      {splitRemaining === 0
                        ? "Fully allocated"
                        : `Remaining ${formatINR(splitRemaining)}`}
                    </span>
                  </div>
                </div>

                {splitRemaining !== 0 ? (
                  <Button className="w-full" disabled>
                    Allocate the full {formatINR(total)} to continue
                  </Button>
                ) : split.upi > 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    {qr ? (
                      <>
                        <img
                          src={qr.imageUrl}
                          alt="UPI QR"
                          className="h-72 w-72 max-w-full rounded-lg border border-border bg-white object-contain p-2"
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Waiting for UPI payment of{" "}
                          {formatINR(split.upi)}…
                        </div>
                      </>
                    ) : (
                      <Button
                        className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                        onClick={() => generateQr(split.upi, buildPartLabel())}
                        disabled={generating}
                      >
                        {generating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        Generate UPI QR ({formatINR(split.upi)})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() =>
                        completePayment({ paymentMode: buildPartLabel(), upiRef: undefined })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark UPI received manually
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                    onClick={() =>
                      completePayment({ paymentMode: buildPartLabel(), upiRef: undefined })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirm Part Payment
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => completePayment({ paymentMode: mode, upiRef: undefined })}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm {mode} Payment
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
