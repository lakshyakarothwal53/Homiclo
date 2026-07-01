import { useState } from "react";

import { amountInRange, parseAmount, type AmountRange, type AmountSort } from "./amount-filter";

/**
 * Client-side search + amount sort/range for the billing/POS tables. Returns the
 * filtered rows plus the control state to hand to `FilterBar`. Pass `amountKey`
 * only for pages with a money column; omit it to get search-only behaviour.
 */
export function useTableQuery<T extends Record<string, unknown>>(
  rows: T[],
  searchKeys: (keyof T)[],
  amountKey?: keyof T,
) {
  const [search, setSearch] = useState("");
  const [amountSort, setAmountSort] = useState<AmountSort>("none");
  const [amountRange, setAmountRange] = useState<AmountRange>("all");

  const q = search.trim().toLowerCase();
  let filtered = rows.filter((r) =>
    q === ""
      ? true
      : searchKeys.some((k) =>
          String(r[k] ?? "")
            .toLowerCase()
            .includes(q),
        ),
  );

  if (amountKey) {
    filtered = filtered.filter((r) =>
      amountInRange(parseAmount(r[amountKey] as string | number), amountRange),
    );
    if (amountSort !== "none") {
      filtered = [...filtered].sort((a, b) => {
        const av = parseAmount(a[amountKey] as string | number);
        const bv = parseAmount(b[amountKey] as string | number);
        return amountSort === "low" ? av - bv : bv - av;
      });
    }
  }

  return {
    search,
    setSearch,
    amountSort,
    setAmountSort,
    amountRange,
    setAmountRange,
    rows: filtered,
  };
}
