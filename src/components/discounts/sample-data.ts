import type { PromoRow } from "./types";

/** Builds three sample rows (two active, one expired) for a discount-type page. */
export function samplePromoRows(prefix: string): PromoRow[] {
  return [
    {
      id: `${prefix}-a`,
      name: `${prefix} Discount A`,
      code: "PROMO10",
      valueType: "percentage",
      value: 10,
      minOrder: 500,
      validFrom: "2024-11-01",
      validTo: "2024-11-30",
      used: 42,
      cap: null,
      status: "Active",
    },
    {
      id: `${prefix}-b`,
      name: `${prefix} Discount B`,
      code: "PROMO20",
      valueType: "percentage",
      value: 20,
      minOrder: 1000,
      validFrom: "2024-11-05",
      validTo: "2024-11-25",
      used: 18,
      cap: null,
      status: "Active",
    },
    {
      id: `${prefix}-c`,
      name: `${prefix} Discount C`,
      code: "PROMO50",
      valueType: "flat",
      value: 50,
      minOrder: 250,
      validFrom: "2024-10-01",
      validTo: "2024-10-31",
      used: 102,
      cap: null,
      status: "Expired",
    },
  ];
}

/** Flat page variant — values expressed as flat ₹ amounts. */
export function sampleFlatRows(prefix: string): PromoRow[] {
  return samplePromoRows(prefix).map((r, i) => ({
    ...r,
    valueType: "flat",
    value: [100, 250, 50][i],
  }));
}
