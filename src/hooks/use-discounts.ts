import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PromoRow } from "@/components/discounts/types";
import type {
  DiscountCampaign,
  DiscountSeasonRow,
  DiscountsDashboard,
  DiscountsActiveRow,
  DiscountUsageRow,
} from "@/types/discounts";

export function useDiscountsDashboard() {
  return useQuery({
    queryKey: ["discounts", "dashboard"],
    queryFn: async (): Promise<DiscountsDashboard> => {
      const { data, error } = await supabase.from("discounts_dashboard").select("data").single();
      if (error) throw error;
      return data.data as DiscountsDashboard;
    },
  });
}

export function useDiscountsActive() {
  return useQuery({
    queryKey: ["discounts", "active"],
    queryFn: async (): Promise<DiscountsActiveRow[]> => {
      const { data, error } = await supabase
        .from("discounts_active")
        .select("name, type, value, appliesTo:applies_to, validTill:valid_till, used, status");
      if (error) throw error;
      return data as unknown as DiscountsActiveRow[];
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
          "id, name, code, valueType:value_type, value, minOrder:min_order, validFrom:valid_from, validTo:valid_to, used, cap, status",
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

// SUPABASE-SWAP: wire AddDiscountDialog's onAdd callback to this mutation to persist new promos
export function useCreateDiscountPromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PromoRow): Promise<PromoRow> => {
      const { error } = await supabase.from("discount_promos").insert({
        id: input.id,
        discount_type: input.valueType,
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
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
  });
}
