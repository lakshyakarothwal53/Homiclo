import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import {
  formatCurrency,
  formatDate,
  type DiscountStatus,
  type DiscountTarget,
  type PromoRow,
} from "@/components/discounts/types";
import type {
  DiscountCampaign,
  DiscountCampaignInput,
  DiscountRedemption,
  DiscountSeasonRow,
  DiscountSeasonInput,
  DiscountsDashboard,
  DiscountsActiveRow,
  DiscountUsageRow,
} from "@/types/discounts";
import type { AppliedCoupon } from "@/types/pos";

function toAppliedCoupon(row: {
  code: unknown;
  value_type: unknown;
  value: unknown;
  min_order: unknown;
  valid_from: unknown;
  valid_to: unknown;
  used: unknown;
  cap: unknown;
  applies_to_type: unknown;
  applies_to: unknown;
  buy_qty?: unknown;
  get_qty?: unknown;
}): AppliedCoupon {
  const appliesTo = ((row.applies_to as { id: string; label: string }[] | null) ?? []).map(
    (t) => t.id,
  );
  const valueType =
    row.value_type === "percentage" ? "percentage" : row.value_type === "bogo" ? "bogo" : "flat";
  return {
    code: row.code as string,
    valueType,
    value: Number(row.value) || 0,
    buyQty: row.buy_qty != null ? Number(row.buy_qty) : undefined,
    getQty: row.get_qty != null ? Number(row.get_qty) : undefined,
    minOrder: Number(row.min_order) || 0,
    validFrom: (row.valid_from as string) ?? "",
    validTo: (row.valid_to as string) ?? "",
    cap: row.cap === null || row.cap === undefined ? null : Number(row.cap),
    used: Number(row.used) || 0,
    appliesToType: (row.applies_to_type as AppliedCoupon["appliesToType"]) ?? null,
    appliesTo,
  };
}

// discount_promos lookup — Product/Category/Flat/Percentage Discounts.
async function fetchPromoCoupon(clean: string): Promise<AppliedCoupon | null> {
  const { data, error } = await supabase
    .from("discount_promos")
    .select(
      "code, value_type, value, status, min_order, valid_from, valid_to, used, cap, applies_to_type, applies_to",
    )
    .ilike("code", clean)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.status !== "Active") return null;
  return toAppliedCoupon(row);
}

// discount_campaigns lookup — only rows an admin has explicitly made
// redeemable (code + value_type + value all set via the "Make this
// redeemable at checkout" section) resolve as a coupon; display-only
// campaigns (code IS NULL) are never matched here.
async function fetchCampaignCoupon(clean: string): Promise<AppliedCoupon | null> {
  const { data, error } = await supabase
    .from("discount_campaigns")
    .select(
      "code, value_type, value, status, min_order, redeem_valid_from, redeem_valid_to, redeem_used, cap, applies_to_type, applies_to, buy_qty, get_qty",
    )
    .ilike("code", clean)
    .not("code", "is", null)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.status !== "Active") return null;
  const isBogo = row.value_type === "bogo";
  if (isBogo ? row.buy_qty === null || row.get_qty === null : row.value === null) {
    return null;
  }
  return toAppliedCoupon({
    ...row,
    valid_from: row.redeem_valid_from,
    valid_to: row.redeem_valid_to,
    used: row.redeem_used,
  });
}

// discount_seasonal lookup — same "must be explicitly made redeemable" rule
// as campaigns. Reads redeem_valid_from/redeem_valid_to (real ISO dates), not
// the existing free-text valid_from/valid_to display columns (e.g. "01 Nov",
// no year — not reliable for an expiry comparison).
async function fetchSeasonalCoupon(clean: string): Promise<AppliedCoupon | null> {
  const { data, error } = await supabase
    .from("discount_seasonal")
    .select(
      "code, value_type, value, status, min_order, redeem_valid_from, redeem_valid_to, redeem_used, cap, applies_to_type, applies_to",
    )
    .ilike("code", clean)
    .not("code", "is", null)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.status !== "Active" || row.value_type === null || row.value === null) {
    return null;
  }
  return toAppliedCoupon({
    ...row,
    valid_from: row.redeem_valid_from,
    valid_to: row.redeem_valid_to,
    used: row.redeem_used,
  });
}

// Resolve a coupon code against active promos in discount settings. Returns the
// applicable discount (percentage or flat), the guardrails around it (min
// order, validity window, usage cap, product/category restriction) or null
// when no active promo matches — the caller (POS "Apply" button) is
// responsible for checking those guardrails against the current cart.
// Tries Product/Category/Flat/Percentage Discounts first, then falls back to
// any Campaign or Seasonal Offer an admin has made redeemable.
export async function fetchCouponByCode(code: string): Promise<AppliedCoupon | null> {
  const clean = code.trim();
  if (!clean) return null;
  return (
    (await fetchPromoCoupon(clean)) ??
    (await fetchCampaignCoupon(clean)) ??
    (await fetchSeasonalCoupon(clean))
  );
}

// Case-insensitive coupon code collision check across all three redeemable
// sources (discount_promos, discount_campaigns, discount_seasonal) — codes
// must be unique store-wide so a POS lookup is never ambiguous. Best-effort
// (not race-proof), matching the demo-grade RLS used elsewhere in this module.
export async function isCodeTaken(
  code: string,
  exclude?: { table: "discount_promos" | "discount_campaigns" | "discount_seasonal"; key: string },
): Promise<boolean> {
  const clean = code.trim();
  if (!clean) return false;

  async function checkPromo() {
    const { data, error } = await supabase
      .from("discount_promos")
      .select("id")
      .ilike("code", clean)
      .limit(5);
    if (error) throw error;
    const rows = data ?? [];
    if (exclude?.table === "discount_promos") return rows.some((r) => r.id !== exclude.key);
    return rows.length > 0;
  }

  async function checkCampaign() {
    const { data, error } = await supabase
      .from("discount_campaigns")
      .select("name")
      .ilike("code", clean)
      .limit(5);
    if (error) throw error;
    const rows = data ?? [];
    if (exclude?.table === "discount_campaigns") return rows.some((r) => r.name !== exclude.key);
    return rows.length > 0;
  }

  async function checkSeasonal() {
    const { data, error } = await supabase
      .from("discount_seasonal")
      .select("season")
      .ilike("code", clean)
      .limit(5);
    if (error) throw error;
    const rows = data ?? [];
    if (exclude?.table === "discount_seasonal") return rows.some((r) => r.season !== exclude.key);
    return rows.length > 0;
  }

  const [promo, campaign, seasonal] = await Promise.all([
    checkPromo(),
    checkCampaign(),
    checkSeasonal(),
  ]);
  return promo || campaign || seasonal;
}

// A promo plus the discount_type bucket it belongs to (product/category/flat/percentage).
export type PromoInput = PromoRow & { discountType: string };

// Dashboard stat cards, computed live from campaigns + promos + usage (no static snapshot).
// A "redemption" here is any completed POS sale that had a coupon code
// applied — pos_transactions.coupon_code/discount/subtotal are written by
// handlePaid() in routes/_app/pos/index.tsx on every checkout, and cover a
// code from any of the three redeemable sources (Product/Category/Flat/
// Percentage Discounts, Campaigns, Seasonal Offers — they all resolve
// through the same fetchCouponByCode()). discount_usage, by contrast, is a
// separate hand-edited log (see Usage Reports' full CRUD) seeded with demo
// numbers that nothing keeps in sync with real sales — using it here made
// every dashboard stat static regardless of what actually happened at POS.
async function fetchRedemptions() {
  const { data, error } = await supabase
    .from("pos_transactions")
    .select("coupon_code, discount, subtotal, created_at")
    .not("coupon_code", "is", null);
  if (error) throw error;
  return (data ?? []) as { coupon_code: string; discount: number | null; subtotal: number | null; created_at: string }[];
}

export function useDiscountsDashboard() {
  return useQuery({
    queryKey: ["discounts", "dashboard"],
    queryFn: async (): Promise<DiscountsDashboard> => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [campaigns, promos, redemptions] = await Promise.all([
        supabase.from("discount_campaigns").select("status"),
        supabase.from("discount_promos").select("status"),
        fetchRedemptions(),
      ]);
      if (campaigns.error) throw campaigns.error;
      if (promos.error) throw promos.error;

      const activeCampaigns = (campaigns.data ?? []).filter((c) => c.status === "Active").length;
      const livePromos = (promos.data ?? []).filter((p) => p.status === "Active").length;

      const timesUsed = redemptions.length;
      const discountGivenThisMonth = redemptions
        .filter((r) => r.created_at >= monthStart)
        .reduce((s, r) => s + (r.discount ?? 0), 0);
      const totalDiscount = redemptions.reduce((s, r) => s + (r.discount ?? 0), 0);
      const totalSubtotal = redemptions.reduce((s, r) => s + (r.subtotal ?? 0), 0);
      const avgDiscount = totalSubtotal > 0 ? Math.round((totalDiscount / totalSubtotal) * 100) : 0;

      return {
        activeCampaigns: String(activeCampaigns),
        activeCampaignsHint: `${livePromos} discounts live`,
        discountGiven: formatCurrency(discountGivenThisMonth),
        discountGivenHint: "This month",
        timesUsed: String(timesUsed),
        timesUsedHint: "Across all promos",
        avgDiscount: `${avgDiscount}%`,
        avgDiscountHint: "Per transaction",
      };
    },
  });
}

// Active Discounts table — real active promos, with a live redemption count
// (see fetchRedemptions above) instead of discount_promos.used, which is
// only ever set at creation and never incremented by an actual POS sale.
export function useDiscountsActive() {
  return useQuery({
    queryKey: ["discounts", "active"],
    queryFn: async (): Promise<DiscountsActiveRow[]> => {
      const [promos, redemptions] = await Promise.all([
        supabase
          .from("discount_promos")
          .select("name, code, discount_type, value_type, value, min_order, valid_to, cap, status")
          .eq("status", "Active"),
        fetchRedemptions(),
      ]);
      if (promos.error) throw promos.error;

      const usedByCode = new Map<string, number>();
      for (const r of redemptions) {
        const code = r.coupon_code.toUpperCase();
        usedByCode.set(code, (usedByCode.get(code) ?? 0) + 1);
      }

      return (promos.data ?? [])
        .map((r) => ({ r, used: usedByCode.get(((r.code as string) ?? "").toUpperCase()) ?? 0 }))
        .sort((a, b) => b.used - a.used)
        .map(({ r, used }) => ({
          name: r.name as string,
          type:
            r.discount_type === "category"
              ? "Category"
              : r.value_type === "flat"
                ? "Flat"
                : "Percentage",
          value: r.value_type === "percentage" ? `${r.value}%` : formatCurrency(r.value as number),
          appliesTo:
            (r.min_order as number) > 0
              ? `Orders > ${formatCurrency(r.min_order as number)}`
              : "All Products",
          validTill: formatDate(r.valid_to as string, true),
          used: `${used} / ${r.cap ?? "—"}`,
          status: r.status as DiscountStatus,
        }));
    },
  });
}

// filter by discount_type ('flat' | 'percentage' | 'category' | 'product'), optionally by branch
export function useDiscountPromos(discountType: string, branch?: string) {
  const allBranches = !branch || branch === "All Branches";
  return useQuery({
    queryKey: ["discounts", "promos", discountType, branch ?? "All Branches"],
    queryFn: async (): Promise<PromoRow[]> => {
      let query = (
        allBranches ? supabase.from("discount_promos") : supabase.from("discount_promos_branches")
      )
        .select(
          "id, name, code, valueType:value_type, value, minOrder:min_order, validFrom:valid_from, validTo:valid_to, used, cap, status, appliesToType:applies_to_type, appliesTo:applies_to",
        )
        .eq("discount_type", discountType);
      if (!allBranches) query = query.eq("branch", branch);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PromoRow[];
    },
  });
}

export function useDiscountBranches() {
  return useQuery({
    queryKey: ["discounts", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}

// Searchable target options for the AddDiscountDialog multi-select. Both search
// server-side and cap results so pickers stay fast with thousands of products.
export function useProductOptions(search: string) {
  const q = search.trim();
  return useQuery({
    queryKey: ["discounts", "product-options", q],
    queryFn: async (): Promise<DiscountTarget[]> => {
      let query = supabase.from("products").select("sku, name").order("name").limit(50);
      if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((p) => ({ id: p.sku as string, label: p.name as string }));
    },
  });
}

export function useCategoryOptions(search: string) {
  const q = search.trim();
  return useQuery({
    queryKey: ["discounts", "category-options", q],
    queryFn: async (): Promise<DiscountTarget[]> => {
      let query = supabase.from("categories").select("name").order("name").limit(50);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.name as string, label: c.name as string }));
    },
  });
}

// Redemption fields as they don't exist on the *_branches snapshot tables
// (see useDiscountSeasonal) — a branch-filtered row is always display-only.
const NOT_REDEEMABLE: DiscountRedemption = {
  code: null,
  valueType: null,
  value: null,
  minOrder: 0,
  cap: null,
  redeemUsed: 0,
  redeemValidFrom: null,
  redeemValidTo: null,
  appliesToType: null,
  appliesTo: [],
};

export function useDiscountCampaigns() {
  return useQuery({
    queryKey: ["discounts", "campaigns"],
    queryFn: async (): Promise<DiscountCampaign[]> => {
      const { data, error } = await supabase
        .from("discount_campaigns")
        .select(
          "name, blurb, validTill:valid_till, used, status, code, valueType:value_type, value, buyQty:buy_qty, getQty:get_qty, minOrder:min_order, cap, redeemUsed:redeem_used, redeemValidFrom:redeem_valid_from, redeemValidTo:redeem_valid_to, appliesToType:applies_to_type, appliesTo:applies_to",
        );
      if (error) throw error;
      return data as unknown as DiscountCampaign[];
    },
  });
}

export function useDiscountSeasonal(branch?: string) {
  const allBranches = !branch || branch === "All Branches";
  return useQuery({
    queryKey: ["discounts", "seasonal", branch ?? "All Branches"],
    queryFn: async (): Promise<DiscountSeasonRow[]> => {
      if (!allBranches) {
        const { data, error } = await supabase
          .from("discount_seasonal_branches")
          .select("season, offer, discount, validFrom:valid_from, validTo:valid_to, status")
          .eq("branch", branch);
        if (error) throw error;
        return (data ?? []).map((r) => ({ ...r, ...NOT_REDEEMABLE })) as unknown as DiscountSeasonRow[];
      }
      const { data, error } = await supabase
        .from("discount_seasonal")
        .select(
          "season, offer, discount, validFrom:valid_from, validTo:valid_to, status, code, valueType:value_type, value, minOrder:min_order, cap, redeemUsed:redeem_used, redeemValidFrom:redeem_valid_from, redeemValidTo:redeem_valid_to, appliesToType:applies_to_type, appliesTo:applies_to",
        );
      if (error) throw error;
      return data as unknown as DiscountSeasonRow[];
    },
  });
}

// Every row is a real redemption computed from pos_transactions (see
// fetchRedemptions above), grouped by code, with each code's display name
// resolved against whichever of the three redeemable sources owns it —
// discount_usage (the old hand-edited log this replaced) is no longer read
// anywhere in the app.
export function useDiscountUsage(branch?: string) {
  const allBranches = !branch || branch === "All Branches";
  return useQuery({
    queryKey: ["discounts", "usage", branch ?? "All Branches"],
    queryFn: async (): Promise<DiscountUsageRow[]> => {
      let txnQuery = supabase
        .from("pos_transactions")
        .select("invoice, coupon_code, subtotal, discount, total, invoice_date, created_at")
        .not("coupon_code", "is", null);
      if (!allBranches) txnQuery = txnQuery.eq("branch", branch);

      const [txns, promos, campaigns, seasonal] = await Promise.all([
        txnQuery,
        supabase.from("discount_promos").select("name, code"),
        supabase.from("discount_campaigns").select("name, code").not("code", "is", null),
        supabase.from("discount_seasonal").select("season, code").not("code", "is", null),
      ]);
      if (txns.error) throw txns.error;
      if (promos.error) throw promos.error;
      if (campaigns.error) throw campaigns.error;
      if (seasonal.error) throw seasonal.error;

      const nameByCode = new Map<string, string>();
      for (const p of promos.data ?? []) {
        if (p.code) nameByCode.set((p.code as string).toUpperCase(), p.name as string);
      }
      for (const c of campaigns.data ?? []) {
        if (c.code) nameByCode.set((c.code as string).toUpperCase(), c.name as string);
      }
      for (const s of seasonal.data ?? []) {
        if (s.code) nameByCode.set((s.code as string).toUpperCase(), s.season as string);
      }

      const byCode = new Map<string, DiscountUsageRow>();
      for (const t of txns.data ?? []) {
        const code = (t.coupon_code as string).toUpperCase();
        const row = byCode.get(code) ?? {
          discount: nameByCode.get(code) ?? code,
          code,
          timesUsed: 0,
          discountGiven: 0,
          avgOrder: 0,
          transactions: [],
        };
        row.timesUsed += 1;
        row.discountGiven += (t.discount as number) ?? 0;
        row.transactions.push({
          invoice: t.invoice as string,
          date: (t.invoice_date as string) || (t.created_at as string)?.slice(0, 10) || "",
          subtotal: (t.subtotal as number) ?? 0,
          discount: (t.discount as number) ?? 0,
          total: (t.total as number) ?? 0,
        });
        byCode.set(code, row);
      }

      return Array.from(byCode.values())
        .map((row) => ({
          ...row,
          avgOrder: Math.round(
            row.transactions.reduce((s, t) => s + t.total, 0) / row.transactions.length,
          ),
        }))
        .sort((a, b) => b.timesUsed - a.timesUsed);
    },
  });
}

// --- CRUD: promos (global writes; see supabase/discounts/04_crud.sql) ---

function promoRow(input: PromoInput) {
  return {
    discount_type: input.discountType,
    name: input.name,
    code: input.code,
    value_type: input.valueType,
    value: input.value,
    min_order: input.minOrder,
    valid_from: input.validFrom,
    valid_to: input.validTo,
    used: input.used,
    cap: input.cap,
    status: input.status,
    applies_to_type: input.appliesToType,
    applies_to: input.appliesTo,
  };
}

export function useCreateDiscountPromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PromoInput): Promise<PromoInput> => {
      const { error } = await supabase
        .from("discount_promos")
        .insert({ id: input.id, ...promoRow(input) });
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateDiscountPromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PromoInput): Promise<PromoInput> => {
      const { error } = await supabase
        .from("discount_promos")
        .update(promoRow(input))
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteDiscountPromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { error } = await supabase.from("discount_promos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

// Shared insert/update payload for the optional "make this redeemable at
// checkout" block on campaigns/seasonal — code null means the row stays
// display-only, matching DiscountRedemption's default.
function redemptionPayload(r: DiscountRedemption) {
  return {
    code: r.code || null,
    value_type: r.code ? r.valueType : null,
    value: r.code ? r.value : null,
    min_order: r.code ? r.minOrder || 0 : 0,
    cap: r.code ? r.cap : null,
    redeem_valid_from: r.code ? r.redeemValidFrom : null,
    redeem_valid_to: r.code ? r.redeemValidTo : null,
    applies_to_type: r.code ? r.appliesToType : null,
    applies_to: r.code ? r.appliesTo : [],
  };
}

// buy_qty/get_qty ("Buy X Get Y Free") only exist on discount_campaigns —
// discount_seasonal has no such columns, so this is kept out of the shared
// redemptionPayload() and applied to campaign writes only.
function campaignBogoPayload(input: DiscountCampaignInput) {
  const isBogo = !!input.code && input.valueType === "bogo";
  return {
    buy_qty: isBogo ? input.buyQty : null,
    get_qty: isBogo ? input.getQty : null,
  };
}

// --- CRUD: campaigns (identity = name) ---

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DiscountCampaignInput): Promise<DiscountCampaignInput> => {
      if (input.code && (await isCodeTaken(input.code))) {
        throw new Error(`Code "${input.code}" is already in use by another discount.`);
      }
      const { error } = await supabase.from("discount_campaigns").insert({
        name: input.name,
        blurb: input.blurb,
        valid_till: input.validTill,
        used: input.used,
        status: input.status,
        ...redemptionPayload(input),
        ...campaignBogoPayload(input),
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DiscountCampaignInput & { originalName: string },
    ): Promise<DiscountCampaignInput> => {
      if (
        input.code &&
        (await isCodeTaken(input.code, { table: "discount_campaigns", key: input.originalName }))
      ) {
        throw new Error(`Code "${input.code}" is already in use by another discount.`);
      }
      const { error } = await supabase
        .from("discount_campaigns")
        .update({
          name: input.name,
          blurb: input.blurb,
          valid_till: input.validTill,
          used: input.used,
          status: input.status,
          ...redemptionPayload(input),
          ...campaignBogoPayload(input),
        })
        .eq("name", input.originalName);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      const { error } = await supabase.from("discount_campaigns").delete().eq("name", name);
      if (error) throw error;
      return name;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

// --- CRUD: seasonal offers (identity = season) ---

export function useCreateSeasonal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DiscountSeasonInput): Promise<DiscountSeasonInput> => {
      if (input.code && (await isCodeTaken(input.code))) {
        throw new Error(`Code "${input.code}" is already in use by another discount.`);
      }
      const { error } = await supabase.from("discount_seasonal").insert({
        season: input.season,
        offer: input.offer,
        discount: input.discount,
        valid_from: input.validFrom,
        valid_to: input.validTo,
        status: input.status,
        ...redemptionPayload(input),
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateSeasonal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DiscountSeasonInput & { originalSeason: string },
    ): Promise<DiscountSeasonInput> => {
      if (
        input.code &&
        (await isCodeTaken(input.code, { table: "discount_seasonal", key: input.originalSeason }))
      ) {
        throw new Error(`Code "${input.code}" is already in use by another discount.`);
      }
      const { error } = await supabase
        .from("discount_seasonal")
        .update({
          season: input.season,
          offer: input.offer,
          discount: input.discount,
          valid_from: input.validFrom,
          valid_to: input.validTo,
          status: input.status,
          ...redemptionPayload(input),
        })
        .eq("season", input.originalSeason);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteSeasonal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (season: string): Promise<string> => {
      const { error } = await supabase.from("discount_seasonal").delete().eq("season", season);
      if (error) throw error;
      return season;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

