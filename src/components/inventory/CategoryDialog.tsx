import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryInput } from "@/hooks/use-inventory";
import type { Category } from "@/types/inventory";

export function CategoryDialog({
  mode,
  initial,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Category;
  /** Optional trigger element; omit when controlling `open` externally. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (values: CategoryInput) => void;
}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;

  const [name, setName] = useState(initial?.name ?? "");
  const [productCount, setProductCount] = useState(String(initial?.productCount ?? 0));
  const [stockValue, setStockValue] = useState(initial?.stockValue ?? "₹0");

  function reset() {
    setName(initial?.name ?? "");
    setProductCount(String(initial?.productCount ?? 0));
    setStockValue(initial?.stockValue ?? "₹0");
  }

  // Keep fields in sync when the dialog reopens (e.g. editing a different row).
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    onSave({
      name: name.trim(),
      productCount: Number(productCount) || 0,
      stockValue: stockValue.trim() || "₹0",
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Category" : "Edit Category"}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Create a new product category." : "Update this category's details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apparel"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-count">Product count</Label>
              <Input
                id="c-count"
                type="number"
                min={0}
                value={productCount}
                onChange={(e) => setProductCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-value">Stock value</Label>
              <Input
                id="c-value"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                placeholder="₹0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            {mode === "add" ? "Add category" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
