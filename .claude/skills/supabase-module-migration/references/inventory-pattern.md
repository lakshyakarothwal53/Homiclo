# The inventory migration — canonical reference

Inventory is the worked example every new module copies. Read the live files
alongside this doc; they are the source of truth:

- `src/types/inventory.ts` — the domain types (the contract)
- `src/hooks/use-inventory.ts` — the hooks (queries + one mutation)
- `supabase/01_schema.sql`, `02_seed.sql`, `03_rls.sql` — the SQL
- `supabase.md` — the human walkthrough + table→hook→type reference

## 1. Table ↔ type ↔ hook mapping

| Table | Type (`src/types/inventory.ts`) | Hook |
|---|---|---|
| `products` | `Product` | `useProducts(search?)` |
| `categories` | `Category` | `useCategories(search?)` |
| `stock_inward` | `StockInwardEntry` | `useStockInward(search?)` |
| `stock_outward` | `StockOutwardEntry` | `useStockOutward(search?)` |
| `stock_history` | `StockHistoryEntry` | `useStockHistory(search?)` |
| `low_stock_alerts` | `LowStockAlert` | `useLowStockAlerts(search?)` |
| `inventory_reports` | `InventoryReport` | `useInventoryReports(search?)` |
| `inventory_dashboard` (1-row JSONB) | `InventoryDashboard` | `useInventoryDashboard()` |
| `stock_adjustments` (+products,+history) | `StockAdjustmentInput` | `useSubmitStockAdjustment()` (mutation) |

## 2. Schema patterns (from `supabase/01_schema.sql`)

- **Natural primary key** when one exists: `products.sku`, `categories.name`,
  `stock_inward.grn`. Otherwise synthesize: `id uuid primary key default
  gen_random_uuid()` (`stock_history`, `inventory_reports`).
- **Display strings stay text** for parity: `cost text` ("₹35,000"),
  `stock_value text` ("₹4.8L"), `date text` ("12 Nov"), `last_updated text`
  ("2 hours ago"). Real numbers are `integer` (price, stock, qty, change).
- **Aggregate/dashboard payload → single-row JSONB table**:
  ```sql
  create table if not exists inventory_dashboard (
    id   integer primary key default 1,
    data jsonb not null,
    constraint inventory_dashboard_singleton check (id = 1)
  );
  ```
- **Mutation target table** carries its own audit columns:
  `stock_adjustments (id uuid pk, sku, adjusted_stock int, reason, date, notes,
  created_at timestamptz default now())`.

## 3. Seed pattern (from `supabase/02_seed.sql`)
`truncate` all module tables first (re-runnable), then `insert ... values` with
the exact mock values. The dashboard row pastes the JSON object:
```sql
insert into inventory_dashboard (id, data) values (1, '{ "stats": { ... } }'::jsonb);
```

## 4. RLS pattern (from `supabase/03_rls.sql`)
Enable RLS on every table. Read for everyone, write only where needed:
```sql
create policy products_read on products for select to anon, authenticated using (true);
-- writes for the adjustment mutation:
create policy products_update on products for update to anon, authenticated using (true) with check (true);
create policy stock_history_insert on stock_history for insert to anon, authenticated with check (true);
```
Always label these demo-grade and in need of tightening before production.

## 5. Hook patterns (from `src/hooks/use-inventory.ts`)

**Query with camelCase aliasing** (snake_case column → camelCase type field):
```ts
export function useStockInward(search?: string) {
  return useQuery({
    queryKey: ["inventory", "stock-inward", search ?? ""],
    queryFn: async (): Promise<StockInwardEntry[]> => {
      let query = supabase
        .from("stock_inward")
        .select("date, grn, product, supplier, qty, cost, receivedBy:received_by");
      if (search) query = query.or(`product.ilike.%${search}%,grn.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockInwardEntry[];
    },
  });
}
```
- Single-field search → `query.ilike("name", `%${search}%`)`.
- Two-field search → `query.or("a.ilike.%s%,b.ilike.%s%")`.
- When aliases are used, cast `data as unknown as T[]` (the select string is
  opaque to the type checker). Plain `*`/exact columns can cast `data as T[]`.

**Single-row JSONB read:**
```ts
const { data, error } = await supabase.from("inventory_dashboard").select("data").single();
if (error) throw error;
return data.data as InventoryDashboard;
```

**Mutation (multi-step write + invalidate):**
```ts
export function useSubmitStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockAdjustmentInput) => {
      const { error } = await supabase.from("stock_adjustments").insert({
        sku: input.sku, adjusted_stock: input.adjustedStock, reason: input.reason,
        date: input.date, notes: input.notes,
      });
      if (error) throw error;
      // ...update products.stock, insert stock_history...
      return input;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
```

## 6. Component wiring (from `src/routes/_app/inventory/products.tsx`)
The route just swaps a static array for the hook; rendering is untouched:
```ts
const [search, setSearch] = useState("");
const { data = [], isLoading } = useProducts(search);
```

## 7. Verify
```bash
bunx prettier --write src/hooks/use-<module>.ts src/types/<module>.ts <changed routes>
bunx eslint src/hooks/use-<module>.ts <changed files>   # lint only your files
bun run build
```
The build must pass with empty `.env` — `src/lib/supabase.ts` falls back to a
placeholder URL so import never throws.
