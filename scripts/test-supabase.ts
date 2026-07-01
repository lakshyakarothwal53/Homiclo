import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Missing credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

console.log(`Connecting to ${url} ...`);

const supabase = createClient(url, key);

const { data, error, count } = await supabase
  .from("products")
  .select("sku", { count: "exact" })
  .limit(1);

// PGRST205 = reached PostgREST successfully, table just doesn't exist yet.
if (error && error.code === "PGRST205") {
  console.log("✅ Connected — credentials valid. (Schema not created yet: 'products' table missing.)");
  process.exit(0);
}

if (error) {
  console.error(`❌ Connection failed: ${error.message}`);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.warn(
    "⚠️  Connected, but anon key reads 0 rows from 'products'. " +
      "Rows likely blocked by RLS — run supabase/03_rls.sql to add read policies.",
  );
  process.exit(2);
}

console.log(`✅ Connected — anon key can read 'products' (${count} rows visible).`);
