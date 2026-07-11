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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateSku } from "@/lib/inventory-utils";
import type { Product } from "@/types/inventory";

export type ProductFormValues = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  status: string;
};

export type AddToStockInput = {
  sku: string;
  addStock: number;
};

export function ProductFormDialog({
  mode,
  title,
  description,
  initial,
  categories,
  allProducts,
  trigger,
  open,
  onOpenChange,
  onSave,
  onAddToStock,
}: {
  mode: "add" | "edit";
  title: string;
  description?: string;
  initial?: Product;
  categories: string[];
  allProducts: Product[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (values: ProductFormValues) => void;
  onAddToStock?: (input: AddToStockInput) => void;
}) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? open : internalOpen;
  const [isAddingToStock, setIsAddingToStock] = useState(false);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);

  function buildInitialValues(): ProductFormValues {
    return {
      sku: initial?.sku ?? (mode === "add" ? generateSku() : ""),
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      price: initial?.price ?? 0,
      stock: initial?.stock ?? 0,
      minStock: initial?.minStock ?? 10,
      status: initial?.status ?? "In Stock",
    };
  }

  const [values, setValues] = useState<ProductFormValues>(buildInitialValues);

  useEffect(() => {
    // Re-seed on every open so "add" always starts from a fresh auto SKU.
    if (actualOpen) setValues(buildInitialValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualOpen, initial]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  function submit() {
    if (!values.sku.trim()) {
      toast.error("SKU is required.");
      return;
    }
    if (!values.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!values.category) {
      toast.error("Category is required.");
      return;
    }
    if (!values.status) {
      toast.error("Status is required.");
      return;
    }

    // Extremely unlikely (same-millisecond auto SKU), but guard anyway: if it
    // somehow collides with an existing product, offer "add to stock" instead
    // of a failed insert on the sku primary key.
    if (mode === "add") {
      const existing = allProducts.find((p) => p.sku === values.sku.trim());
      if (existing) {
        setIsAddingToStock(true);
        setExistingProduct(existing);
        return;
      }
    }

    const out: ProductFormValues = {
      sku: values.sku.trim(),
      name: values.name.trim(),
      category: values.category,
      price: values.price,
      stock: values.stock,
      minStock: values.minStock,
      status: values.status,
    };
    onSave(out);
    setOpen(false);
  }

  function submitAddToStock() {
    if (!existingProduct) return;
    if (values.stock <= 0) {
      toast.error("Stock quantity must be greater than 0.");
      return;
    }

    onAddToStock?.({
      sku: existingProduct.sku,
      addStock: values.stock,
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setValues(buildInitialValues());
        }
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAddingToStock ? "Add to Stock" : title}</DialogTitle>
          {isAddingToStock ? (
            <DialogDescription>
              "{existingProduct?.name}" already exists. Enter the quantity to add to its stock.
            </DialogDescription>
          ) : description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {isAddingToStock ? (
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm font-medium text-blue-900">Product Found</p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>SKU:</strong> {existingProduct?.sku}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Product:</strong> {existingProduct?.name}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Current Stock:</strong> {existingProduct?.stock} units
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-stock-qty">Quantity to Add</Label>
              <Input
                id="add-stock-qty"
                type="number"
                min="1"
                value={values.stock}
                placeholder="Enter quantity to add"
                onChange={(e) => setValues((s) => ({ ...s, stock: Number(e.target.value) || 0 }))}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Will update stock from {existingProduct?.stock} to{" "}
                <strong>{(existingProduct?.stock ?? 0) + values.stock}</strong> units
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {/* SKU — auto-generated; this same value is the product's scannable barcode. */}
            <div className="grid gap-1.5 sm:col-span-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 grid gap-1.5">
                  <Label htmlFor="product-sku">SKU / Barcode</Label>
                  <Input id="product-sku" type="text" value={values.sku} disabled readOnly />
                </div>
                {mode === "add" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValues((s) => ({ ...s, sku: generateSku() }))}
                    className="mb-0"
                  >
                    Regenerate
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated — this is the exact code printed and scanned at checkout.
              </p>
            </div>

            {/* Product Name */}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="product-name">Product</Label>
              <Input
                id="product-name"
                type="text"
                value={values.name}
                placeholder="Cotton T-Shirt (L)"
                onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div className="grid gap-1.5">
              <Label htmlFor="product-category">Category</Label>
              <Select
                value={values.category}
                onValueChange={(v) => setValues((s) => ({ ...s, category: v }))}
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div className="grid gap-1.5">
              <Label htmlFor="product-price">Price (₹)</Label>
              <Input
                id="product-price"
                type="number"
                value={values.price}
                placeholder="499"
                onChange={(e) => setValues((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
              />
            </div>

            {/* Stock and Minimum Stock */}
            <div className="grid gap-1.5">
              <Label htmlFor="product-stock">Stock</Label>
              <Input
                id="product-stock"
                type="number"
                value={values.stock}
                placeholder="100"
                onChange={(e) => setValues((s) => ({ ...s, stock: Number(e.target.value) || 0 }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="product-minstock">Minimum Stock</Label>
              <Input
                id="product-minstock"
                type="number"
                min="0"
                value={values.minStock}
                placeholder="10"
                onChange={(e) =>
                  setValues((s) => ({ ...s, minStock: Number(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stock below this level will show as "Low Stock"
              </p>
            </div>

            {/* Status (Auto-calculated) */}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="product-status">Status (Auto-calculated)</Label>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-md">
                <Select
                  value={values.status}
                  onValueChange={(v) => setValues((s) => ({ ...s, status: v }))}
                >
                  <SelectTrigger id="product-status" className="border-0 bg-transparent">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {["In Stock", "Low Stock", "Out of Stock"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground ml-auto">
                  {values.stock === 0
                    ? "Out of Stock (stock = 0)"
                    : values.stock < values.minStock
                      ? `Low Stock (${values.stock} < ${values.minStock})`
                      : `In Stock (${values.stock} ≥ ${values.minStock})`}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {isAddingToStock ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingToStock(false);
                  setExistingProduct(null);
                  setValues(buildInitialValues());
                }}
              >
                Back
              </Button>
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={submitAddToStock}
              >
                Add to Stock
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
                {mode === "add" ? "Add" : "Save changes"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
