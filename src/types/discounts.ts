import type { DiscountStatus, DiscountTarget, DiscountTargetType } from "@/components/discounts/types";

export type DiscountsDashboard = {
  activeCampaigns: string;
  activeCampaignsHint: string;
  discountGiven: string;
  discountGivenHint: string;
  timesUsed: string;
  timesUsedHint: string;
  avgDiscount: string;
  avgDiscountHint: string;
};

export type DiscountsActiveRow = {
  name: string;
  type: "Percentage" | "Flat" | "Category";
  value: string;
  appliesTo: string;
  validTill: string;
  used: string;
  status: DiscountStatus;
};

// Optional "make this redeemable at checkout" block — reused by Campaigns and
// Seasonal Offers so either can be turned into a real POS coupon on top of
// their existing free-text display copy. code === null means the row stays
// display-only (the default, and the only behavior before this feature).
// Kept deliberately separate from each type's own display fields (blurb/
// valid_till, discount/validFrom/validTo) because those are admin-typed
// strings (e.g. "Up to 30%", "Recurring", "01 Nov" with no year) that aren't
// safe to parse into real bill math or a real expiry check.
export type DiscountRedemption = {
  code: string | null;
  valueType: "percentage" | "flat" | "bogo" | null;
  value: number | null;
  minOrder: number;
  cap: number | null;
  redeemUsed: number;
  redeemValidFrom: string | null;
  redeemValidTo: string | null;
  appliesToType: DiscountTargetType | null;
  appliesTo: DiscountTarget[];
};

export type DiscountCampaign = {
  name: string;
  blurb: string;
  validTill: string;
  used: string;
  status: DiscountStatus;
  // "Buy X Get Y Free" — only meaningful when valueType === "bogo", and only
  // supported on campaigns (discount_seasonal has no buy_qty/get_qty columns).
  buyQty: number | null;
  getQty: number | null;
} & DiscountRedemption;

export type DiscountSeasonRow = {
  season: string;
  offer: string;
  discount: string;
  validFrom: string;
  validTo: string;
  status: DiscountStatus;
} & DiscountRedemption;

export type DiscountUsageRow = {
  discount: string;
  code: string;
  timesUsed: number;
  discountGiven: number;
  avgOrder: number;
  conversion: number;
};

// CRUD input shapes (identity = the natural key each table is written by:
// campaign name, season, usage code — edited via an `original*` field).
export type DiscountCampaignInput = DiscountCampaign;
export type DiscountSeasonInput = DiscountSeasonRow;
export type DiscountUsageInput = DiscountUsageRow;
