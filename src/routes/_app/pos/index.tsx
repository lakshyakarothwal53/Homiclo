import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { formatINR } from "@/components/pos/products";
import { useCart } from "@/components/pos/CartProvider";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { usePagination } from "@/hooks/use-pagination";
import {
  useCreatePosTransaction,
  useNextPosInvoiceNumber,
  usePosBranches,
  usePosProducts,
  usePosSettings,
} from "@/hooks/use-pos";
import { fetchCouponByCode } from "@/hooks/use-discounts";
import { useUpsertCustomer } from "@/hooks/use-customers";
import { printReceipt } from "@/lib/receipt-utils";
import { localDateIso } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import type { PaymentResult, PosProduct } from "@/types/pos";

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
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [payOpen, setPayOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const {
    lines,
    addToCart,
    setQty,
    removeLine,
    clear,
    totals,
    asLineItems,
    coupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { data: rows = [] } = usePosProducts(search, branch);
  const { data: allProducts = [] } = usePosProducts();
  const { data: branches = [] } = usePosBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(rows);
  const { data: nextInvoice } = useNextPosInvoiceNumber();
  const createTransaction = useCreatePosTransaction();
  const upsertCustomer = useUpsertCustomer();

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
      setSearch("");
    },
    enabled: !payOpen,
  });

  // The cart is shared across all POS pages (CartProvider on the /pos layout).
  function addProduct(product: PosProduct) {
    addToCart(product);
    toast.success(`${product.name} added to cart.`);
  }

  const columns: Column<PosProduct>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono text-xs">{r.sku}</span>,
    },
    {
      key: "name",
      header: "Product",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (r) => <span className="text-muted-foreground">{r.category}</span>,
    },
    { key: "price", header: "Price", render: (r) => formatINR(r.price) },
    {
      key: "stock",
      header: "Stock",
      render: (r) => (
        <span className={r.stock <= 10 ? "font-medium text-brand" : "text-foreground"}>
          {r.stock}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <Button
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => addProduct(r)}
        >
          Add to Cart
        </Button>
      ),
    },
  ];

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    try {
      const found = await fetchCouponByCode(code);
      if (!found) {
        toast.error(`No active discount found for "${code}".`);
        return;
      }
      const today = localDateIso();
      if (found.validFrom && today < found.validFrom) {
        toast.error(`Coupon ${found.code} isn't valid yet.`);
        return;
      }
      if (found.validTo && today > found.validTo) {
        toast.error(`Coupon ${found.code} has expired.`);
        return;
      }
      if (found.cap !== null && found.used >= found.cap) {
        toast.error(`Coupon ${found.code} has reached its usage limit.`);
        return;
      }
      if (totals.subtotal < found.minOrder) {
        toast.error(`Coupon ${found.code} requires a minimum order of ${formatINR(found.minOrder)}.`);
        return;
      }
      const eligibleLines =
        !found.appliesToType || found.appliesTo.length === 0
          ? lines
          : lines.filter((l) =>
              found.appliesToType === "product"
                ? found.appliesTo.includes(l.product.sku)
                : found.appliesToType === "category"
                  ? found.appliesTo.includes(l.product.category)
                  : false,
            );
      if (found.appliesToType && found.appliesTo.length > 0 && eligibleLines.length === 0) {
        toast.error(`Coupon ${found.code} doesn't apply to any product in your cart.`);
        return;
      }
      if (found.valueType === "bogo" && found.buyQty && found.getQty) {
        const eligibleUnits = eligibleLines.reduce((n, l) => n + l.qty, 0);
        const bundleSize = found.buyQty + found.getQty;
        if (eligibleUnits < bundleSize) {
          toast.error(
            `Coupon ${found.code} needs at least ${bundleSize} qualifying items in the cart (buy ${found.buyQty} get ${found.getQty} free) — only ${eligibleUnits} in cart now.`,
          );
          return;
        }
      }
      applyCoupon(found);
      toast.success(`Coupon ${found.code} applied.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply coupon.");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    removeCoupon();
    setCouponInput("");
  }

  function handlePaid({ paymentMode, upiRef, customer }: PaymentResult) {
    if (!nextInvoice) {
      toast.error("Still loading invoice number, try again.");
      return;
    }
    const now = new Date();
    const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const receiptLines = asLineItems();
    const snapshot = { ...totals };

    // Save/update the customer master so this mobile number auto-fills next
    // time (PaymentDialog's lookup) instead of being asked for again — a POS
    // sale used to complete without ever writing to `customers`, so a repeat
    // customer never actually got found. Best-effort like create-invoice.tsx:
    // the customers table is optional infrastructure and must never block
    // checkout.
    upsertCustomer.mutate({
      mobile: customer.mobile.trim(),
      name: customer.name,
      gst: customer.gstin || null,
      dob: customer.dob || null,
    });

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
        customerName: customer.name,
        customerMobile: customer.mobile,
        customerDob: customer.dob,
        customerGstin: customer.gstin || undefined,
        invoiceDate: customer.invoiceDate,
        couponCode: coupon?.code,
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
                customerName: customer.name,
                customerMobile: customer.mobile,
                customerDob: customer.dob,
                customerGstin: customer.gstin || undefined,
                invoiceDate: customer.invoiceDate,
              },
              settings,
            );
          }
          clear();
          setCouponInput("");
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
        {/* Catalogue — same product-search table, scan an item with the barcode gun to add it */}
        <div className="min-w-0">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Scan barcode or search by name / SKU..."
            branches={branches}
            branch={branch}
            onBranchChange={setBranch}
          />
          <Card className="overflow-hidden border-border">
            <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.sku} />
            <EntriesFooter
              total={rows.length}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </Card>
        </div>

        {/* Cart */}
        <Card className="flex h-fit flex-col border-border p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Cart ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
            </h2>
            <button
              onClick={() => {
                clear();
                setCouponInput("");
              }}
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
              {/* Coupon code — discount is pulled from discount settings. */}
              <div className="mt-4 border-t border-border pt-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Coupon Code
                </label>
                {coupon ? (
                  <div className="flex items-center justify-between rounded-md border border-[color:var(--success)]/40 bg-[color:var(--success)]/5 px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">
                      {coupon.code}
                      <span className="ml-1 text-muted-foreground">
                        (
                        {coupon.valueType === "percentage"
                          ? `${coupon.value}% off`
                          : `${formatINR(coupon.value)} off`}
                        )
                      </span>
                    </span>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-muted-foreground transition hover:text-brand"
                      aria-label="Remove coupon"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleApplyCoupon();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="h-9 shrink-0"
                      disabled={applyingCoupon || !couponInput.trim()}
                      onClick={() => void handleApplyCoupon()}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>

              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-foreground">{formatINR(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Discount{coupon ? ` (${coupon.code})` : ""}</dt>
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
                <span className="text-xl font-bold text-foreground">{formatINR(totals.total)}</span>
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
