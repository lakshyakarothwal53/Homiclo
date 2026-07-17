import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hashPassword } from "@/hooks/use-employees";
import { supabase } from "@/lib/supabase";
import type { BranchInfo, BranchInput, Role } from "@/types/settings";

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

const MISSING_BRANCH_POLICY_HINT =
  "Branch write failed — run supabase/16_branch_management.sql in the Supabase SQL editor.";

/** Every branch dropdown in the app keys its list query on "…branches";
 *  office-locations is the attendance mirror. Invalidate them all after CRUD. */
function invalidateBranchLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey.includes("branches") || query.queryKey.includes("office-locations"),
  });
}

export function useBranchList() {
  return useQuery({
    queryKey: ["settings", "branches", "detail"],
    queryFn: async (): Promise<BranchInfo[]> => {
      const [branchesRes, adminsRes] = await Promise.all([
        supabase
          .from("branches")
          .select("name, latitude, longitude, radiusMeters:radius_meters, address")
          .order("name"),
        supabase
          .from("branch_admins")
          .select("branch, adminName:admin_name, adminEmail:admin_email"),
      ]);
      if (branchesRes.error) throw branchesRes.error;
      if (adminsRes.error) throw adminsRes.error;
      const admins = new Map((adminsRes.data ?? []).map((a) => [a.branch as string, a]));
      return (branchesRes.data ?? []).map((b) => ({
        name: b.name as string,
        latitude: b.latitude as number | null,
        longitude: b.longitude as number | null,
        radiusMeters: (b.radiusMeters as number) ?? 50,
        address: b.address as string | null,
        adminName: (admins.get(b.name as string)?.adminName as string) ?? null,
        adminEmail: (admins.get(b.name as string)?.adminEmail as string) ?? null,
      }));
    },
  });
}

async function mirrorOfficeLocation(input: BranchInput) {
  const { error } = await supabase.from("office_locations").upsert(
    {
      name: input.name,
      branch: input.name,
      latitude: input.latitude ?? 0,
      longitude: input.longitude ?? 0,
      radius_meters: input.radiusMeters,
      address: input.address,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "branch" },
  );
  if (error) throw new Error(`${MISSING_BRANCH_POLICY_HINT} (${error.message})`);
}

async function upsertBranchAdmin(input: BranchInput) {
  if (!input.adminName || !input.adminEmail) return;
  const { error } = await supabase
    .from("branch_admins")
    .upsert(
      { branch: input.name, admin_name: input.adminName, admin_email: input.adminEmail },
      { onConflict: "branch" },
    );
  if (error) throw new Error(`${MISSING_BRANCH_POLICY_HINT} (${error.message})`);
  if (input.adminPassword) {
    const { error: empError } = await supabase.from("employees").insert({
      name: input.adminName,
      email: input.adminEmail,
      phone: "—",
      role: "Admin",
      branch: input.name,
      join_date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "Active",
      salary: "—",
      password_hash: await hashPassword(input.adminPassword),
    });
    if (empError) throw empError;
  }
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BranchInput) => {
      const { error } = await supabase.from("branches").insert({
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_meters: input.radiusMeters,
        address: input.address,
      });
      if (error) throw new Error(`${MISSING_BRANCH_POLICY_HINT} (${error.message})`);
      await mirrorOfficeLocation(input);
      await upsertBranchAdmin(input);
      return input;
    },
    onSuccess: () => {
      invalidateBranchLists(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    // Branch name is the PK referenced by junction tables — it is immutable here.
    mutationFn: async (input: BranchInput) => {
      const { error } = await supabase
        .from("branches")
        .update({
          latitude: input.latitude,
          longitude: input.longitude,
          radius_meters: input.radiusMeters,
          address: input.address,
        })
        .eq("name", input.name);
      if (error) throw new Error(`${MISSING_BRANCH_POLICY_HINT} (${error.message})`);
      await mirrorOfficeLocation(input);
      await upsertBranchAdmin(input);
      return input;
    },
    onSuccess: () => {
      invalidateBranchLists(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("branches").delete().eq("name", name);
      if (error) {
        if (error.code === "23503") {
          throw new Error(
            `Cannot delete "${name}" — employees are still assigned to this branch. Reassign or remove them first.`,
          );
        }
        throw new Error(`${MISSING_BRANCH_POLICY_HINT} (${error.message})`);
      }
      const { error: officeError } = await supabase
        .from("office_locations")
        .delete()
        .eq("branch", name);
      if (officeError) throw new Error(`${MISSING_BRANCH_POLICY_HINT} (${officeError.message})`);
      return name;
    },
    onSuccess: () => invalidateBranchLists(queryClient),
  });
}
