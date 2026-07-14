import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProductOptions, useCategoryOptions } from "@/hooks/use-discounts";
import type { DiscountTarget, DiscountTargetType } from "./types";

export function TargetMultiSelect({
  type,
  value,
  onChange,
}: {
  type: DiscountTargetType;
  value: DiscountTarget[];
  onChange: (next: DiscountTarget[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Both hooks are always called (rules of hooks); only the active one is used.
  const products = useProductOptions(type === "product" ? search : "");
  const categories = useCategoryOptions(type === "category" ? search : "");
  const source = type === "product" ? products : categories;
  const options = type === "brand" ? [] : (source.data ?? []);
  const isLoading = type !== "brand" && source.isLoading;

  const noun = type === "product" ? "products" : type === "category" ? "categories" : "brands";

  function toggle(target: DiscountTarget) {
    const exists = value.some((v) => v.id === target.id);
    onChange(exists ? value.filter((v) => v.id !== target.id) : [...value, target]);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }

  if (type === "brand") {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        Brand targeting isn’t available yet — no brand data exists in the catalog.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length ? `${value.length} ${noun} selected` : `Select ${noun}…`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          {/* shouldFilter=false: results are already filtered server-side by `search`. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${noun} by ${type === "product" ? "name or SKU" : "name"}…`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
              )}
              {!isLoading && <CommandEmpty>No {noun} found.</CommandEmpty>}
              {!isLoading &&
                options.map((opt) => {
                  const selected = value.some((v) => v.id === opt.id);
                  return (
                    <CommandItem key={opt.id} value={opt.id} onSelect={() => toggle(opt)}>
                      <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{opt.label}</span>
                      {type === "product" && opt.id !== opt.label && (
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {opt.id}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v.id} variant="secondary" className="gap-1 pr-1">
              {v.label}
              <button
                type="button"
                onClick={() => remove(v.id)}
                className="rounded-sm opacity-60 hover:opacity-100"
                aria-label={`Remove ${v.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
