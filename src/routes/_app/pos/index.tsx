import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ScanLine, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/components/pos/products";
import { useCart } from "@/components/pos/CartProvider";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import {
  useCreatePosTransaction,
  useNextPosInvoiceNumber,
  usePosProducts,
  usePosSettings,
} from "@/hooks/use-pos";
import { printReceipt } from "@/lib/receipt-utils";
import { useAuth } from "@/components/auth/AuthProvider";
import type { PosProduct } from "@/types/pos";

export const Route = createFileRoute("/_app/pos/")({
  head: () => ({
    meta: [
      { title: "POS Dashboard — HOMIQLO" },
      { name: "description", content: "Dashboard overview and controls." },
    ],
  }),
  component: Page,
});

// Short confirmation beep on a successful scan.
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available */
  }
}

function Page() {
  const { user } = useAuth();
  const { settings } = usePosSettings();
  const [query, setQuery] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const { lines, addToCart, setQty, removeLine, clear, totals, asLineItems } = useCart();

  const { data: visible = [] } = usePosProducts(query.trim() || undefined);
  const { data: allProducts = [] } = usePosProducts();
  const { data: nextInvoice } = useNextPosInvoiceNumber();
  const createTransaction = useCreatePosTransaction();

  function lookupAndAdd(code: string) {
    const clean = code.trim();
    if (!clean) return;
    const product =
      allProducts.find((p) => p.barcode === clean) ??
      allProducts.find((p) => p.sku.toLowerCase() === clean.toLowerCase()) ??
      allProducts.find((p) => p.name.toLowerCase() === clean.toLowerCase());
    if (product) {
      addToCart(product);
      beep();
      toast.success(`${product.name} · ${formatINR(product.price)}`);
    } else {
      toast.error(`No product found for "${clean}".`);
    }
  }

  // USB scanner (keyboard-wedge) works whenever this screen is open. Clear the
  // search box too, in case the burst landed while it was focused.
  useBarcodeScanner({
    onScan: (code) => {
      lookupAndAdd(code);
      setQuery("");
    },
    enabled: !payOpen,
  });

  function onProductClick(product: PosProduct) {
    addToCart(product);
  }

  function handlePaid({ paymentMode, upiRef }: { paymentMode: string; upiRef?: string }) {
    if (!nextInvoice) {
      toast.error("Still loading invoice number, try again.");
      return;
    }
    const now = new Date();
    const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const receiptLines = asLineItems();
    const snapshot = { ...totals };

    createTransaction.mutate(
      {
        invoice: nextInvoice,
        time,
        items: snapshot.itemCount,
        amount: formatINR(snapshot.total),
        payment: paymentMode,
        cashier: user?.name ?? "Unknown",
        status: "Completed",
        subtotal: snapshot.subtotal,
        discount: snapshot.discount,
        gst: snapshot.gst,
        total: snapshot.total,
        upiRef,
        lines: receiptLines,
      },
      {
        onSuccess: () => {
          toast.success(`Payment of ${formatINR(snapshot.total)} completed · ${nextInvoice}`);
          if (settings.autoPrint) {
            printReceipt(
              {
                invoice: nextInvoice,
                dateTime: now.toLocaleString("en-IN"),
                cashier: user?.name ?? "Unknown",
                paymentMode,
                upiRef,
                lines: receiptLines,
                subtotal: snapshot.subtotal,
                discount: snapshot.discount,
                gst: snapshot.gst,
                total: snapshot.total,
              },
              settings,
            );
          }
          clear();
          setPayOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Payment failed."),
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="POS › Dashboard"
        title="POS Dashboard"
        description="Scan an item with the barcode gun or tap a product to add it."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Catalogue */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <form
              className="relative flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                lookupAndAdd(query);
                setQuery("");
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scan barcode or search product..."
                className="pl-9"
              />
            </form>
            <div className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
              <ScanLine className="h-4 w-4 text-brand" /> Scanner ready
            </div>
          </div>

          <Card className="border-border p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => (
                <button
                  key={p.sku}
                  onClick={() => onProductClick(p)}
                  className="group rounded-lg border border-border p-3 text-left transition hover:border-brand/40 hover:shadow-sm"
                >
                  <div className="aspect-[4/3] rounded-md bg-gradient-to-br from-secondary to-[color-mix(in_oklab,var(--brand)_8%,var(--secondary))]" />
                  <div className="mt-2.5 truncate text-sm font-medium text-foreground">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-brand">
                    {formatINR(p.price)}
                  </div>
                </button>
              ))}
              {visible.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No products match “{query}”.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Cart */}
        <Card className="flex h-fit flex-col border-border p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Cart ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
            </h2>
            <button
              onClick={clear}
              className="text-sm font-medium text-muted-foreground transition hover:text-brand"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Cart is empty. Scan an item or tap a product to add it.
              </p>
            ) : (
              lines.map((l) => (
                <div key={l.product.sku} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {l.product.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatINR(l.product.price)} each
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setQty(l.product.sku, l.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium">{l.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setQty(l.product.sku, l.qty + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <button
                        onClick={() => removeLine(l.product.sku)}
                        className="ml-1 text-muted-foreground transition hover:text-brand"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-foreground">
                    {formatINR(l.product.price * l.qty)}
                  </div>
                </div>
              ))
            )}
          </div>

          {lines.length > 0 && (
            <>
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-foreground">{formatINR(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Discount ({settings.discountRate}%)</dt>
                  <dd className="font-medium text-[color:var(--success)]">
                    -{formatINR(totals.discount)}
                  </dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>GST {settings.gstRate}%</dt>
                  <dd className="font-medium text-foreground">{formatINR(totals.gst)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">
                  {formatINR(totals.total)}
                </span>
              </div>

              <Button
                className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={createTransaction.isPending || !nextInvoice}
                onClick={() => setPayOpen(true)}
              >
                Collect Payment
              </Button>
            </>
          )}
        </Card>
      </div>

      {nextInvoice && (
        <PaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          total={totals.total}
          invoice={nextInvoice}
          onPaid={handlePaid}
        />
      )}
    </>
  );
}
