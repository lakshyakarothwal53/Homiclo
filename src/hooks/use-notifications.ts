import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Circle,
  Clock,
  DatabaseBackup,
  Diamond,
  Download,
  IndianRupee,
  LogOut,
  RefreshCw,
  Tag,
  TrendingUp,
  UserCheck,
  UserX,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { AlertCategory, AlertItem, Tone } from "@/types/notifications";

// Map stored icon_name strings back to LucideIcon components
const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  Circle,
  Clock,
  DatabaseBackup,
  Diamond,
  Download,
  IndianRupee,
  LogOut,
  RefreshCw,
  Tag,
  TrendingUp,
  UserCheck,
  UserX,
};

type RawNotification = {
  id: string;
  category: string;
  title: string;
  description: string;
  time: string;
  tone: string;
  icon_name: string;
};

export function useNotifications(category: string) {
  return useQuery({
    queryKey: ["notifications", category],
    queryFn: async (): Promise<AlertItem[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, category, title, description, time, tone, icon_name")
        .eq("category", category);
      if (error) throw error;
      return (data as RawNotification[]).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        time: r.time,
        tone: r.tone as Tone,
        icon: ICON_MAP[r.icon_name] ?? Circle,
        category: r.category as AlertCategory,
      }));
    },
  });
}
