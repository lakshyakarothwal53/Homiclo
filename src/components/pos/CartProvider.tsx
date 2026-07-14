import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { usePosSettings } from "@/hooks/use-pos";
import type { AppliedCoupon, PosLineItem, PosProduct } from "@/types/pos";

export type CartLine = { product: PosProduct; qty: number };

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
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
    const gst = Math.round((subtotal - discount) * (settings.gstRate / 100));
    const total = subtotal - discount + gst;
    return { itemCount, subtotal, discount, gst, total };
  }, [lines, coupon, settings.gstRate]);

  const asLineItems = useCallback(
    (): PosLineItem[] =>
      lines.map((l) => ({
        barcode: l.product.barcode,
        sku: l.product.sku,
        name: l.product.name,
        qty: l.qty,
        unitPrice: l.product.price,
        lineTotal: l.product.price * l.qty,
      })),
    [lines],
  );

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
