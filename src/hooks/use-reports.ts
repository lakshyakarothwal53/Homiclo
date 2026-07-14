import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { ReportCategory, ReportRow } from "@/types/reports";

// All six report pages read through this one hook. The reports table is keyed by
// `category`; ReportListPage does its own in-memory search, so the hook only
// fetches the category slice — components stay unchanged.

export function useReports(category: ReportCategory, branch?: string) {
  const allBranches = !branch || branch === "All Branches";
  return useQuery({
    queryKey: ["reports", category, branch ?? "All Branches"],
    queryFn: async (): Promise<ReportRow[]> => {
      let query = (allBranches ? supabase.from("reports") : supabase.from("reports_branches"))
        .select("id, name, type, period, generated, size")
        .eq("category", category);
      if (!allBranches) query = query.eq("branch", branch);
      const { data, error } = await query;
      if (error) throw error;
      return data as ReportRow[];
    },
  });
}

export function useCreateReport(category: ReportCategory) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ReportRow, "id"> & { branch?: string }): Promise<ReportRow> => {
      const { branch, ...rest } = input;
      const row = { id: crypto.randomUUID(), category, ...rest };
      const { error } = await supabase.from("reports").insert(row);
      if (error) throw error;
      // Branch-scoped sessions are pinned to one branch: mirror the report into
      // the per-branch table their list view reads (needs the FK repoint in
      // supabase/16_branch_management.sql).
      if (branch && branch !== "All Branches") {
        const { error: branchError } = await supabase
          .from("reports_branches")
          .insert({ ...row, branch });
        if (branchError) throw branchError;
      }
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// Reports used to have its own branch vocabulary (city outlets in
// report_branches); supabase/16_branch_management.sql repoints reports_branches
// at the shared `branches` table, so the dropdown reads the canonical list.
export function useReportBranches() {
  return useQuery({
    queryKey: ["reports", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}
