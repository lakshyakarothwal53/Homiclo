import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types/customer";

export function useCustomerSearch(search: string) {
  const term = search.trim();
  return useQuery({
    queryKey: ["customers", "search", term],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("mobile, name, gst, dob")
        .or(`name.ilike.%${term}%,mobile.ilike.%${term}%`)
        .limit(5);
      if (error) throw error;
      return data as Customer[];
    },
    enabled: term.length > 0,
  });
}

/** Exact-match lookup by mobile (the customers table's key) — used by the POS
 * Customer Details step to auto-fill name/DOB/GST once a full 10-digit
 * number is entered, instead of the fuzzy name/mobile substring search
 * useCustomerSearch does for the Create Invoice suggestion dropdown. */
export async function fetchCustomerByMobile(mobile: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("mobile, name, gst, dob")
    .eq("mobile", mobile)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

export function useUpsertCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Customer): Promise<Customer> => {
      if (!input.mobile.trim()) return input;
      const { error } = await supabase.from("customers").upsert({
        mobile: input.mobile,
        name: input.name,
        gst: input.gst || null,
        dob: input.dob || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
