import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScanLine, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PRODUCTS, formatINR, type Product } from "@/components/pos/products";

export const Route = createFileRoute("/_app/pos/")({
  head: () => ({
    meta: [
      { title: "POS Dashboard — HOMIQLO" },
      { name: "description", content: "Dashboard overview and controls." },
    ],
  }),
  component: Page,
});

const GST_RATE = 0.18;
const DISCOUNT_RATE = 0.1;

type CartLine = { product: Product; qty: number };

function Page() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([
    { product: PRODUCTS[0], qty: 2 },
    { product: PRODUCTS[2], qty: 1 },
    { product: PRODUCTS[4], qty: 1 },
  ]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [query]);

  const addToCart = (product: Product) =>
    setCart((prev) => {
      const existing = prev.find((l) => l.product.sku === product.sku);
      if (existing) {
        return prev.map((l) =>
          l.product.sku === product.sku ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { product, qty: 1 }];
    });

  const itemCount = cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discount = Math.round(subtotal * DISCOUNT_RATE);
  const gst = Math.round((subtotal - discount) * GST_RATE);
  const total = subtotal - discount + gst;

  return (
    <>
      <PageHeader
        eyebrow="POS › Dashboard"
        title="POS Dashboard"
        description="Dashboard overview and controls."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Catalogue */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scan barcode or search product..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <ScanLine className="h-4 w-4" /> Scan
            </Button>
          </div>

          <Card className="border-border p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => (
                <button
                  key={p.sku}
                  onClick={() => addToCart(p)}
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
              Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
            </h2>
            <button
              onClick={() => setCart([])}
              className="text-sm font-medium text-muted-foreground transition hover:text-brand"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Cart is empty. Tap a product to add it.
              </p>
            ) : (
              cart.map((l) => (
                <div key={l.product.sku} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {l.product.name}
                      {l.qty > 1 && <span className="text-muted-foreground"> × {l.qty}</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {l.qty > 1
                        ? `${formatINR(l.product.price)} each`
                        : formatINR(l.product.price)}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-foreground">
                    {formatINR(l.product.price * l.qty)}
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <>
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-foreground">{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Discount (10%)</dt>
                  <dd className="font-medium text-[color:var(--success)]">-{formatINR(discount)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>GST 18%</dt>
                  <dd className="font-medium text-foreground">{formatINR(gst)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{formatINR(total)}</span>
              </div>

              <Button
                className="mt-5 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => toast.success(`Payment of ${formatINR(total)} initiated`)}
              >
                Proceed to Payment
              </Button>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
