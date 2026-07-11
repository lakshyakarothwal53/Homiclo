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
  DiscountSeasonRow,
  DiscountSeasonInput,
  DiscountsDashboard,
  DiscountsActiveRow,
  DiscountUsageRow,
  DiscountUsageInput,
} from "@/types/discounts";
import type { AppliedCoupon } from "@/types/pos";

// Resolve a coupon code against active promos in discount settings. Returns the
// applicable discount (percentage or flat) or null when no active promo matches.
export async function fetchCouponByCode(code: string): Promise<AppliedCoupon | null> {
  const clean = code.trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from("discount_promos")
    .select("code, value_type, value, status")
    .ilike("code", clean)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.status !== "Active") return null;
  return {
    code: row.code as string,
    valueType: row.value_type === "percentage" ? "percentage" : "flat",
    value: Number(row.value) || 0,
  };
}

// A promo plus the discount_type bucket it belongs to (product/category/flat/percentage).
export type PromoInput = PromoRow & { discountType: string };

// Dashboard stat cards, computed live from campaigns + promos + usage (no static snapshot).
export function useDiscountsDashboard() {
  return useQuery({
    queryKey: ["discounts", "dashboard"],
    queryFn: async (): Promise<DiscountsDashboard> => {
      const [campaigns, promos, usage] = await Promise.all([
        supabase.from("discount_campaigns").select("status"),
        supabase.from("discount_promos").select("value, value_type, status"),
        supabase.from("discount_usage").select("times_used, discount_given"),
      ]);
      if (campaigns.error) throw campaigns.error;
      if (promos.error) throw promos.error;
      if (usage.error) throw usage.error;

      const activeCampaigns = (campaigns.data ?? []).filter((c) => c.status === "Active").length;
      const livePromos = (promos.data ?? []).filter((p) => p.status === "Active").length;
      const timesUsed = (usage.data ?? []).reduce((s, r) => s + (r.times_used ?? 0), 0);
      const discountGiven = (usage.data ?? []).reduce((s, r) => s + (r.discount_given ?? 0), 0);
      const pct = (promos.data ?? []).filter((p) => p.value_type === "percentage");
      const avgDiscount = pct.length
        ? Math.round(pct.reduce((s, p) => s + (p.value ?? 0), 0) / pct.length)
        : 0;

      return {
        activeCampaigns: String(activeCampaigns),
        activeCampaignsHint: `${livePromos} discounts live`,
        discountGiven: formatCurrency(discountGiven),
        discountGivenHint: "This month",
        timesUsed: String(timesUsed),
        timesUsedHint: "Across all promos",
        avgDiscount: `${avgDiscount}%`,
        avgDiscountHint: "Per transaction",
      };
    },
  });
}

// Active Discounts table — derived from real active promos so it reflects CRUD.
export function useDiscountsActive() {
  return useQuery({
    queryKey: ["discounts", "active"],
    queryFn: async (): Promise<DiscountsActiveRow[]> => {
      const { data, error } = await supabase
        .from("discount_promos")
        .select("name, discount_type, value_type, value, min_order, valid_to, used, cap, status")
        .eq("status", "Active")
        .order("used", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
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
        used: `${r.used} / ${r.cap ?? "—"}`,
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

export function useDiscountCampaigns() {
  return useQuery({
    queryKey: ["discounts", "campaigns"],
    queryFn: async (): Promise<DiscountCampaign[]> => {
      const { data, error } = await supabase
        .from("discount_campaigns")
        .select("name, blurb, validTill:valid_till, used, status");
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
      let query = (
        allBranches
          ? supabase.from("discount_seasonal")
          : supabase.from("discount_seasonal_branches")
      ).select("season, offer, discount, validFrom:valid_from, validTo:valid_to, status");
      if (!allBranches) query = query.eq("branch", branch);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DiscountSeasonRow[];
    },
  });
}

export function useDiscountUsage(branch?: string) {
  const allBranches = !branch || branch === "All Branches";
  return useQuery({
    queryKey: ["discounts", "usage", branch ?? "All Branches"],
    queryFn: async (): Promise<DiscountUsageRow[]> => {
      let query = (
        allBranches ? supabase.from("discount_usage") : supabase.from("discount_usage_branches")
      ).select(
        "discount, code, timesUsed:times_used, discountGiven:discount_given, avgOrder:avg_order, conversion",
      );
      if (!allBranches) query = query.eq("branch", branch);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DiscountUsageRow[];
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

// --- CRUD: campaigns (identity = name) ---

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DiscountCampaignInput): Promise<DiscountCampaignInput> => {
      const { error } = await supabase.from("discount_campaigns").insert({
        name: input.name,
        blurb: input.blurb,
        valid_till: input.validTill,
        used: input.used,
        status: input.status,
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
      const { error } = await supabase
        .from("discount_campaigns")
        .update({
          name: input.name,
          blurb: input.blurb,
          valid_till: input.validTill,
          used: input.used,
          status: input.status,
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
      const { error } = await supabase.from("discount_seasonal").insert({
        season: input.season,
        offer: input.offer,
        discount: input.discount,
        valid_from: input.validFrom,
        valid_to: input.validTo,
        status: input.status,
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
      const { error } = await supabase
        .from("discount_seasonal")
        .update({
          season: input.season,
          offer: input.offer,
          discount: input.discount,
          valid_from: input.validFrom,
          valid_to: input.validTo,
          status: input.status,
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

// --- CRUD: usage records (identity = code) ---

export function useCreateUsage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DiscountUsageInput): Promise<DiscountUsageInput> => {
      const { error } = await supabase.from("discount_usage").insert({
        code: input.code,
        discount: input.discount,
        times_used: input.timesUsed,
        discount_given: input.discountGiven,
        avg_order: input.avgOrder,
        conversion: input.conversion,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateUsage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DiscountUsageInput & { originalCode: string },
    ): Promise<DiscountUsageInput> => {
      const { error } = await supabase
        .from("discount_usage")
        .update({
          code: input.code,
          discount: input.discount,
          times_used: input.timesUsed,
          discount_given: input.discountGiven,
          avg_order: input.avgOrder,
          conversion: input.conversion,
        })
        .eq("code", input.originalCode);
      if (error) throw error;
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteUsage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { error } = await supabase.from("discount_usage").delete().eq("code", code);
      if (error) throw error;
      return code;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });
}
