import { useQuery } from "@tanstack/react-query";

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

// Reports has its own branch vocabulary (city outlets), distinct from the shared
// `branches` table used by inventory/billing/discounts — see supabase/reports/04_branches.sql.
export function useReportBranches() {
  return useQuery({
    queryKey: ["reports", "branches"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("report_branches").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((b) => b.name as string);
    },
  });
}
