import { createClient } from "@supabase/supabase-js";

// Fallbacks keep createClient from throwing at import time while .env is still
// empty (it requires a non-empty url). Until real keys land, queries fail at the
// network layer and inventory pages render empty states instead of crashing SSR.
const url = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export const supabase = createClient(url, key);
