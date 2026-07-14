import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Role } from "@/types/settings";

function like(value: string) {
  return `%${value}%`;
}

const MISSING_TABLE_HINT =
  "Settings storage missing — run supabase/13_completion_pack.sql in the Supabase SQL editor.";

/**
 * Generic persisted settings blob (Company / Tally / Preferences /
 * Notification rules), one JSONB value per key in app_settings.
 */
export function useAppSetting<T>(key: string) {
  return useQuery({
    queryKey: ["settings", "app", key],
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      // PGRST205 = app_settings table not created yet — treat as "no saved value".
      if (error) {
        if (error.code === "PGRST205") return null;
        throw error;
      }
      return (data?.value as T) ?? null;
    },
  });
}

export function useSaveAppSetting<T>(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: T): Promise<T> => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) {
        throw new Error(error.code === "PGRST205" ? MISSING_TABLE_HINT : error.message);
      }
      return value;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "app", key] });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Role): Promise<Role> => {
      const { error } = await supabase.from("roles").insert({
        role: input.role,
        users: input.users,
        description: input.description,
        permissions: input.permissions,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Role & { originalRole: string }): Promise<Role> => {
      const { error } = await supabase
        .from("roles")
        .update({
          role: input.role,
          users: input.users,
          description: input.description,
          permissions: input.permissions,
        })
        .eq("role", input.originalRole);
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
    },
  });
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
