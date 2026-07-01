import type { DiscountStatus } from "@/components/discounts/types";

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

export type DiscountCampaign = {
  name: string;
  blurb: string;
  validTill: string;
  used: string;
  status: DiscountStatus;
};

export type DiscountSeasonRow = {
  season: string;
  offer: string;
  discount: string;
  validFrom: string;
  validTo: string;
  status: DiscountStatus;
};

export type DiscountUsageRow = {
  discount: string;
  code: string;
  timesUsed: number;
  discountGiven: number;
  avgOrder: number;
  conversion: number;
};
