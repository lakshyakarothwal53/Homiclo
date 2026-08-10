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
  /** Sum of taxable values across all slabs — prices are GST-inclusive, so this is net of GST. */
  taxableTotal: number;
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
  coupons: AppliedCoupon[];
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: (code: string) => void;
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

// Assign each cart line to at most ONE coupon — most specific wins
// (product > category > store-wide), ties keep the earliest-applied coupon —
// then spread each coupon's discount across only the lines it owns. Returns a
// discount amount per line in the same order as `lines`, so no product is ever
// discounted by two coupons.
function computeLineDiscounts(lines: CartLine[], coupons: AppliedCoupon[]): number[] {
  const perLine = new Array<number>(lines.length).fill(0);
  if (coupons.length === 0 || lines.length === 0) return perLine;

  const covers = (c: AppliedCoupon, line: CartLine) => {
    if (c.appliesToType === "product") return c.appliesTo.includes(line.product.sku);
    if (c.appliesToType === "category") return c.appliesTo.includes(line.product.category);
    if (!c.appliesToType || c.appliesTo.length === 0) return true; // store-wide
    return false; // brand / targeted but non-matching type
  };
  const specificity = (c: AppliedCoupon) =>
    c.appliesToType === "product" ? 2 : c.appliesToType === "category" ? 1 : 0;

  // Owning coupon index per line (-1 = uncovered → no discount).
  const owner = lines.map((line) => {
    let bestIdx = -1;
    let bestSpec = -1;
    coupons.forEach((c, ci) => {
      if (!covers(c, line)) return;
      const s = specificity(c);
      if (s > bestSpec) {
        bestSpec = s;
        bestIdx = ci; // strictly greater keeps the earliest coupon on ties
      }
    });
    return bestIdx;
  });

  const groups = new Map<number, number[]>();
  owner.forEach((ci, li) => {
    if (ci < 0) return;
    const g = groups.get(ci);
    if (g) g.push(li);
    else groups.set(ci, [li]);
  });

  for (const [ci, lineIdxs] of groups) {
    const c = coupons[ci];
    const groupSubtotal = lineIdxs.reduce(
      (s, li) => s + lines[li].product.price * lines[li].qty,
      0,
    );
    let groupDiscount = 0;
    if (c.valueType === "bogo" && c.buyQty && c.getQty) {
      const unitPrices = lineIdxs.flatMap((li) =>
        Array(lines[li].qty).fill(lines[li].product.price),
      );
      const bundleSize = c.buyQty + c.getQty;
      const freeUnits = Math.floor(unitPrices.length / bundleSize) * c.getQty;
      groupDiscount = unitPrices
        .sort((a, b) => a - b)
        .slice(0, freeUnits)
        .reduce((s, p) => s + p, 0);
    } else if (c.valueType === "percentage") {
      groupDiscount = Math.round(groupSubtotal * (c.value / 100));
    } else {
      groupDiscount = Math.min(c.value, groupSubtotal);
    }

    // Spread the group's discount across its lines by value; last absorbs remainder.
    let allocated = 0;
    lineIdxs.forEach((li, k) => {
      const lineValue = lines[li].product.price * lines[li].qty;
      const share =
        k === lineIdxs.length - 1
          ? groupDiscount - allocated
          : groupSubtotal > 0
            ? Math.round(groupDiscount * (lineValue / groupSubtotal))
            : 0;
      allocated += share;
      perLine[li] = share;
    });
  }

  return perLine;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings } = usePosSettings();
  const [lines, setLines] = useState<CartLine[]>(loadCart);
  const [coupons, setCoupons] = useState<AppliedCoupon[]>([]);

  // Many coupons may be applied to one bill; an exact-duplicate code is ignored.
  const applyCoupon = useCallback(
    (next: AppliedCoupon) =>
      setCoupons((prev) => (prev.some((c) => c.code === next.code) ? prev : [...prev, next])),
    [],
  );
  const removeCoupon = useCallback(
    (code: string) => setCoupons((prev) => prev.filter((c) => c.code !== code)),
    [],
  );

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
    setCoupons([]);
  }, []);

  // Discount is driven entirely by the applied coupons (fetched from discount
  // settings); with none there is no discount. Multiple coupons may be applied,
  // but each product is discounted by exactly one of them — the most specific
  // coupon targeting it (product > category > store-wide), so e.g. a product
  // with its own coupon ignores a broader category/store-wide code. See
  // computeLineDiscounts.
  const totals = useMemo<CartTotals>(() => {
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const lineDiscounts = computeLineDiscounts(lines, coupons);
    const discount = lineDiscounts.reduce((s, d) => s + d, 0);

    // Per-line GST. Each product is taxed at its OWN rate (falling back to the
    // flat POS rate when it has none). Selling prices are GST-inclusive, so the
    // post-discount value already contains the tax and it is extracted
    // (net = taxable + tax) rather than added on top — and each line's own
    // coupon discount reduces only that line's taxable value.
    const nets = new Map<number, number>();
    lines.forEach((l, i) => {
      const net = Math.max(0, l.product.price * l.qty - lineDiscounts[i]);
      const rate = l.product.gstRate ?? settings.gstRate;
      nets.set(rate, (nets.get(rate) ?? 0) + net);
    });

    const gstBreakdown: GstBucket[] = [...nets.entries()]
      .map(([rate, net]) => {
        const tax = Math.round(net - net / (1 + rate / 100));
        return { rate, taxable: net - tax, tax };
      })
      .sort((a, b) => a.rate - b.rate);
    const gst = gstBreakdown.reduce((s, b) => s + b.tax, 0);
    const taxableTotal = gstBreakdown.reduce((s, b) => s + b.taxable, 0);
    // The tax is already inside the price, so the total is just the discounted gross.
    const total = subtotal - discount;

    // MRP is display-only: it never feeds the total, it just shows the saving.
    // Products with no MRP fall back to their selling price so the comparison
    // stays honest rather than overstating the discount.
    const mrpTotal = lines.reduce((s, l) => s + (l.product.mrp ?? l.product.price) * l.qty, 0);
    const mrpSavings = Math.max(0, mrpTotal - (subtotal - discount));

    return {
      itemCount,
      subtotal,
      discount,
      gst,
      total,
      gstBreakdown,
      taxableTotal,
      mrpTotal,
      mrpSavings,
    };
  }, [lines, coupons, settings.gstRate]);

  // The rate and tax are snapshotted onto each line so a reprinted bill shows
  // what was actually charged, even if the product's GST rate changes later.
  const asLineItems = useCallback((): PosLineItem[] => {
    const lineDiscounts = computeLineDiscounts(lines, coupons);
    return lines.map((l, i) => {
      const lineTotal = l.product.price * l.qty;
      const rate = l.product.gstRate ?? settings.gstRate;
      const net = Math.max(0, lineTotal - lineDiscounts[i]);
      // Prices are GST-inclusive, so the tax is extracted from the line value.
      const gstAmount = Math.round(net - net / (1 + rate / 100));
      return {
        barcode: l.product.barcode,
        sku: l.product.sku,
        name: l.product.name,
        qty: l.qty,
        unitPrice: l.product.price,
        lineTotal,
        gstRate: rate,
        gstAmount,
        mrp: l.product.mrp,
      };
    });
  }, [lines, coupons, settings.gstRate]);

  const value = useMemo(
    () => ({
      lines,
      addToCart,
      setQty,
      removeLine,
      clear,
      totals,
      asLineItems,
      coupons,
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
      coupons,
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
