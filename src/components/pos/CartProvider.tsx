import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { usePosSettings } from "@/hooks/use-pos";
import type { PosLineItem, PosProduct } from "@/types/pos";

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

  const clear = useCallback(() => setLines([]), []);

  const totals = useMemo<CartTotals>(() => {
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const discount = Math.round(subtotal * (settings.discountRate / 100));
    const gst = Math.round((subtotal - discount) * (settings.gstRate / 100));
    const total = subtotal - discount + gst;
    return { itemCount, subtotal, discount, gst, total };
  }, [lines, settings.discountRate, settings.gstRate]);

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
    () => ({ lines, addToCart, setQty, removeLine, clear, totals, asLineItems }),
    [lines, addToCart, setQty, removeLine, clear, totals, asLineItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
