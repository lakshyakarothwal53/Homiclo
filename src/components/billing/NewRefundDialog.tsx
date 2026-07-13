import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateRefund, useNextRefundNumber } from "@/hooks/use-billing";
import { fetchPosTransactionByInvoice, fetchPosTransactionItems } from "@/hooks/use-pos";
import type { PosLineItem } from "@/types/pos";

const REFUND_REASONS = [
  "Damaged item",
  "Wrong product delivered",
  "Size / fit issue",
  "Product defective",
  "Not as described",
  "Changed mind",
  "Duplicate order",
  "Other",
] as const;

const STATUS_OPTIONS = ["Processing", "Completed", "Rejected"] as const;

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

type SelectableItem = PosLineItem & { selected: boolean; refundQty: number };

/**
 * "New Refund" dialog — enter an invoice number and the customer + the sale's
 * line items are pulled in automatically; the cashier picks which products
 * (and how many of each) are being returned, and the refund amount is
 * computed from that selection rather than typed by hand. Falls back to a
 * plain manual amount only for invoices with no saved line-item detail
 * (pre-dates supabase/pos/06_transaction_items.sql, or a manually created
 * invoice from Billing → Create Invoice).
 */
export function NewRefundDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [invoiceInput, setInvoiceInput] = useState("");
  const [debouncedInvoice, setDebouncedInvoice] = useState("");
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [manualAmount, setManualAmount] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [status, setStatus] = useState<string>("Processing");

  const { data: nextRefund } = useNextRefundNumber();
  const createRefund = useCreateRefund();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInvoice(invoiceInput.trim()), 400);
    return () => clearTimeout(t);
  }, [invoiceInput]);

  const { data: txn, isFetching: fetchingTxn } = useQuery({
    queryKey: ["refund-lookup", "txn", debouncedInvoice],
    queryFn: () => fetchPosTransactionByInvoice(debouncedInvoice),
    enabled: debouncedInvoice.length > 0,
  });

  const { data: lineItems, isFetching: fetchingItems } = useQuery({
    queryKey: ["refund-lookup", "items", debouncedInvoice],
    queryFn: () => fetchPosTransactionItems(debouncedInvoice),
    enabled: debouncedInvoice.length > 0,
  });

  // Seed the selectable rows whenever a new invoice resolves — default to
  // fully selected (a whole-order refund is the common case; the cashier
  // unchecks items that aren't being returned, or trims a qty for a partial
  // return of a single line).
  useEffect(() => {
    setItems((lineItems ?? []).map((l) => ({ ...l, selected: true, refundQty: l.qty })));
  }, [lineItems]);

  function reset() {
    setInvoiceInput("");
    setDebouncedInvoice("");
    setItems([]);
    setManualAmount("");
    setReason("");
    setCustomReason("");
    setStatus("Processing");
  }

  const notFound = debouncedInvoice.length > 0 && !fetchingTxn && txn === null;
  const hasLineItems = (lineItems?.length ?? 0) > 0;
  const looking = debouncedInvoice.length > 0 && (fetchingTxn || fetchingItems);

  // pos_transaction_items.unit_price is the PRE-TAX cart price — GST and any
  // discount are only ever stored once, at the whole-transaction level, not
  // per line. So a refund can't just read GST off the line item; it has to be
  // attributed back to each product at refund time. Each product's share of
  // the transaction's discount/GST is proportional to its share of the
  // pre-tax subtotal — the same distribution the checkout's own cart-level
  // GST calculation implies (CartProvider computes one flat gst = (subtotal −
  // discount) × gstRate for the whole cart, so per product it's exactly this
  // proportional split). Falls back to zero discount/GST (raw pre-tax price)
  // for older/legacy transactions that predate the subtotal/gst columns.
  const subtotal = txn?.subtotal ?? 0;
  const discountTotal = txn?.discount ?? 0;
  const gstTotal = txn?.gst ?? 0;
  const taxableBase = subtotal - discountTotal;

  function lineBreakdown(unitPrice: number, qty: number) {
    const lineSubtotal = unitPrice * qty;
    const lineDiscount = subtotal > 0 ? (lineSubtotal / subtotal) * discountTotal : 0;
    const lineTaxable = lineSubtotal - lineDiscount;
    const lineGst = taxableBase > 0 ? (lineTaxable / taxableBase) * gstTotal : 0;
    return { lineSubtotal, lineDiscount, lineGst, lineTotal: lineTaxable + lineGst };
  }

  const selectedItems = items.filter((i) => i.selected && i.refundQty > 0);
  const selectedBreakdown = selectedItems.reduce(
    (acc, i) => {
      const b = lineBreakdown(i.unitPrice, i.refundQty);
      return {
        subtotal: acc.subtotal + b.lineSubtotal,
        discount: acc.discount + b.lineDiscount,
        gst: acc.gst + b.lineGst,
        total: acc.total + b.lineTotal,
      };
    },
    { subtotal: 0, discount: 0, gst: 0, total: 0 },
  );
  const amount = hasLineItems ? selectedBreakdown.total : Number(manualAmount) || 0;

  function toggleItem(sku: string, checked: boolean) {
    setItems((rows) => rows.map((r) => (r.sku === sku ? { ...r, selected: checked } : r)));
  }

  function setQty(sku: string, qty: number) {
    setItems((rows) =>
      rows.map((r) => (r.sku === sku ? { ...r, refundQty: Math.max(1, Math.min(qty, r.qty)) } : r)),
    );
  }

  function handleSubmit() {
    if (!nextRefund) {
      toast.error("Still loading refund number, try again.");
      return;
    }
    if (!debouncedInvoice) {
      toast.error("Enter an invoice number.");
      return;
    }
    if (txn === null) {
      toast.error("No transaction found for this invoice.");
      return;
    }
    if (hasLineItems && selectedItems.length === 0) {
      toast.error("Select at least one product to refund.");
      return;
    }
    if (!hasLineItems && amount <= 0) {
      toast.error("Enter a refund amount.");
      return;
    }
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      toast.error(reason === "Other" ? "Describe the reason." : "Select a reason.");
      return;
    }

    createRefund.mutate(
      {
        refund: nextRefund,
        invoice: debouncedInvoice,
        customer: txn?.customerName || "Walk-in",
        amount: inr(amount),
        amount_num: Math.round(amount),
        reason: finalReason,
        status,
        items: hasLineItems
          ? selectedItems.map((i) => ({
              sku: i.sku,
              name: i.name,
              qty: i.refundQty,
              // The actual (tax-inclusive) amount attributed to this line,
              // per unit — not the raw pre-tax pos_transaction_items price.
              unitPrice: lineBreakdown(i.unitPrice, i.refundQty).lineTotal / i.refundQty,
            }))
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Refund ${nextRefund} created for ${debouncedInvoice}.`);
          onOpenChange(false);
          reset();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create refund."),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Refund</DialogTitle>
          <DialogDescription>
            Enter the original invoice — customer and sale details are pulled in automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="refund-invoice">Original Invoice</Label>
              <Input
                id="refund-invoice"
                value={invoiceInput}
                placeholder="INV-10248"
                autoFocus
                onChange={(e) => setInvoiceInput(e.target.value.toUpperCase())}
              />
              {notFound && (
                <p className="text-xs text-brand">No transaction found for this invoice.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="refund-customer">Customer</Label>
              <Input
                id="refund-customer"
                value={txn ? txn.customerName || "Walk-in" : ""}
                readOnly
                disabled
                placeholder="Auto-filled from invoice"
              />
            </div>
          </div>

          {looking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Looking up invoice…
            </div>
          )}

          {txn && hasLineItems && (
            <div className="space-y-1.5">
              <Label>Products in this invoice</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {items.map((item) => {
                  const b = lineBreakdown(item.unitPrice, item.refundQty);
                  return (
                    <div key={item.sku} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(c) => toggleItem(item.sku, c === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Subtotal {inr(b.lineSubtotal)} + GST {inr(b.lineGst)} · purchased{" "}
                          {item.qty}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={item.qty}
                        value={item.refundQty}
                        disabled={!item.selected}
                        className="h-8 w-16"
                        onChange={(e) => setQty(item.sku, Number(e.target.value) || 1)}
                      />
                      <span className="w-16 shrink-0 text-right font-medium">
                        {inr(item.selected ? b.lineTotal : 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {txn && !hasLineItems && !fetchingItems && (
            <div className="grid gap-1.5">
              <Label htmlFor="refund-amount">Refund Amount (₹)</Label>
              <Input
                id="refund-amount"
                type="number"
                value={manualAmount}
                placeholder="0"
                onChange={(e) => setManualAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                No itemized product data on this invoice — enter the refund amount manually.
              </p>
            </div>
          )}

          <div className="space-y-1.5 rounded-md bg-secondary px-3 py-2 text-sm">
            {hasLineItems && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{inr(selectedBreakdown.subtotal)}</span>
                </div>
                {selectedBreakdown.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{inr(selectedBreakdown.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>GST</span>
                  <span>{inr(selectedBreakdown.gst)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between border-t border-border pt-1.5 font-medium text-foreground">
              <span>Refund Amount</span>
              <span className="text-base font-bold">{inr(amount)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="refund-reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="refund-reason">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="refund-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="refund-status">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {reason === "Other" && (
            <div className="grid gap-1.5">
              <Label htmlFor="refund-reason-other">Describe the reason</Label>
              <Input
                id="refund-reason-other"
                value={customReason}
                placeholder="e.g. Customer no longer needs the item"
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={createRefund.isPending}
            onClick={handleSubmit}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
