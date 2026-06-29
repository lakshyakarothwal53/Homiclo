import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { ReportCategory, ReportRow } from "@/types/reports";

// All six report pages read through this one hook. The reports table is keyed by
// `category`; ReportListPage does its own in-memory search, so the hook only
// fetches the category slice — components stay unchanged.

export function useReports(category: ReportCategory) {
  return useQuery({
    queryKey: ["reports", category],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, name, type, period, generated, size")
        .eq("category", category);
      if (error) throw error;
      return data as ReportRow[];
    },
  });
}
