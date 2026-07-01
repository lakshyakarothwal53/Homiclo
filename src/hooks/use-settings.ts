import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Role } from "@/types/settings";

function like(value: string) {
  return `%${value}%`;
}

export function useRoles(search?: string, branch?: string) {
  const allBranches = !branch || branch === "all";
  return useQuery({
    queryKey: ["settings", "roles", search ?? "", branch ?? "all"],
    queryFn: async (): Promise<Role[]> => {
      let query = (allBranches ? supabase.from("roles") : supabase.from("role_branches")).select(
        "role, users, description, permissions",
      );
      if (!allBranches) query = query.eq("branch", branch);
      if (search) query = query.or(`role.ilike.${like(search)},description.ilike.${like(search)}`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Role[];
    },
  });
}

export function useSettingsBranches() {
  return useQuery({
    queryKey: ["settings", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}
