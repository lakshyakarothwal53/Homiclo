import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { usePosSettings } from "@/hooks/use-pos";
import type { AppliedCoupon, PosLineItem, PosProduct } from "@/types/pos";

export type CartLine = { product: PosProduct; qty: number };

/** Tax charged at one rate, for the bill's GST breakdown. */
export type GstBucket = { rate: number; taxable: number; tax: number };

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  /** One entry per distinct GST rate in the cart, ascending. */
  gstBreakdown: GstBucket[];
  /** Total MRP of the cart, and what the customer saved against it. */
  mrpTotal: number;
  mrpSavings: number;
};

type CartContextValue = {
  lines: CartLine[];
  addToCart: (product: PosProduct, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  removeLine: (sku: string) => void;
  clear: () => void;
  totals: CartTotals;
  asLineItems: () => PosLineItem[];
  coupon: AppliedCoupon | null;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "homiqlo_pos_cart";

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings } = usePosSettings();
  const [lines, setLines] = useState<CartLine[]>(loadCart);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  const applyCoupon = useCallback((next: AppliedCoupon) => setCoupon(next), []);
  const removeCoupon = useCallback(() => setCoupon(null), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full / unavailable — cart just isn't persisted */
    }
  }, [lines]);

  const addToCart = useCallback((product: PosProduct, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.sku === product.sku);
      if (existing) {
        return prev.map((l) => (l.product.sku === product.sku ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { product, qty }];
    });
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product.sku !== sku)
        : prev.map((l) => (l.product.sku === sku ? { ...l, qty } : l)),
    );
  }, []);

  const removeLine = useCallback((sku: string) => {
    setLines((prev) => prev.filter((l) => l.product.sku !== sku));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setCoupon(null);
  }, []);

  // Discount is driven entirely by an applied coupon (fetched from discount
  // settings); with no coupon there is no discount. A coupon restricted to
  // specific products/categories (appliesToType) only discounts the cart
  // lines that match — not the whole cart — so e.g. a "Basmati Rice, Bluetooth
  // Speaker" promo can't knock 10% off a T-shirt just because the code matched.
  const totals = useMemo<CartTotals>(() => {
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    let discount = 0;
    if (coupon) {
      const eligibleLines =
        !coupon.appliesToType || coupon.appliesTo.length === 0
          ? lines
          : lines.filter((l) =>
              coupon.appliesToType === "product"
                ? coupon.appliesTo.includes(l.product.sku)
                : coupon.appliesToType === "category"
                  ? coupon.appliesTo.includes(l.product.category)
                  : false,
            );
      if (coupon.valueType === "bogo" && coupon.buyQty && coupon.getQty) {
        // "Buy X get Y free": flatten eligible lines into one entry per unit,
        // sort cheapest-first, and give away the cheapest Y of every complete
        // (X+Y)-unit bundle — the standard BOGO convention (the discount
        // always favors the customer, same spirit as the flat-coupon
        // Math.min below).
        const unitPrices = eligibleLines.flatMap((l) => Array(l.qty).fill(l.product.price));
        const bundleSize = coupon.buyQty + coupon.getQty;
        const freeUnits = Math.floor(unitPrices.length / bundleSize) * coupon.getQty;
        discount = unitPrices
          .sort((a, b) => a - b)
          .slice(0, freeUnits)
          .reduce((s, p) => s + p, 0);
      } else {
        const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.product.price * l.qty, 0);
        discount =
          coupon.valueType === "percentage"
            ? Math.round(eligibleSubtotal * (coupon.value / 100))
            : Math.min(coupon.value, eligibleSubtotal);
      }
    }
    // Per-line GST. Each product is taxed at its OWN rate (falling back to the
    // flat POS rate when it has none), so a cart mixing 5% and 18% goods bills
    // correctly instead of averaging everything at one rate.
    //
    // The cart discount is apportioned across lines in proportion to their
    // value, so tax is charged on what the customer actually pays for that
    // line, not on its pre-discount value. The last line absorbs any rounding
    // remainder so the apportioned parts always sum back to `discount` exactly.
    const buckets = new Map<number, { taxable: number; tax: number }>();
    let allocatedDiscount = 0;
    lines.forEach((l, i) => {
      const lineValue = l.product.price * l.qty;
      const share =
        i === lines.length - 1
          ? discount - allocatedDiscount
          : subtotal > 0
            ? Math.round(discount * (lineValue / subtotal))
            : 0;
      allocatedDiscount += share;

      const taxable = Math.max(0, lineValue - share);
      const rate = l.product.gstRate ?? settings.gstRate;
      const cur = buckets.get(rate) ?? { taxable: 0, tax: 0 };
      cur.taxable += taxable;
      cur.tax += taxable * (rate / 100);
      buckets.set(rate, cur);
    });

    const gstBreakdown: GstBucket[] = [...buckets.entries()]
      .map(([rate, b]) => ({ rate, taxable: b.taxable, tax: Math.round(b.tax) }))
      .sort((a, b) => a.rate - b.rate);
    const gst = gstBreakdown.reduce((s, b) => s + b.tax, 0);
    const total = subtotal - discount + gst;

    // MRP is display-only: it never feeds the total, it just shows the saving.
    // Products with no MRP fall back to their selling price so the comparison
    // stays honest rather than overstating the discount.
    const mrpTotal = lines.reduce((s, l) => s + (l.product.mrp ?? l.product.price) * l.qty, 0);
    const mrpSavings = Math.max(0, mrpTotal - (subtotal - discount));

    return { itemCount, subtotal, discount, gst, total, gstBreakdown, mrpTotal, mrpSavings };
  }, [lines, coupon, settings.gstRate]);

  // The rate and tax are snapshotted onto each line so a reprinted bill shows
  // what was actually charged, even if the product's GST rate changes later.
  const asLineItems = useCallback((): PosLineItem[] => {
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    let allocated = 0;
    return lines.map((l, i) => {
      const lineTotal = l.product.price * l.qty;
      const share =
        i === lines.length - 1
          ? totals.discount - allocated
          : subtotal > 0
            ? Math.round(totals.discount * (lineTotal / subtotal))
            : 0;
      allocated += share;
      const rate = l.product.gstRate ?? settings.gstRate;
      return {
        barcode: l.product.barcode,
        sku: l.product.sku,
        name: l.product.name,
        qty: l.qty,
        unitPrice: l.product.price,
        lineTotal,
        gstRate: rate,
        gstAmount: Math.round(Math.max(0, lineTotal - share) * (rate / 100)),
        mrp: l.product.mrp,
      };
    });
  }, [lines, totals.discount, settings.gstRate]);

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
