import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [skuLookupLoading, setSkuLookupLoading] = useState(false);
  const [isAddingToStock, setIsAddingToStock] = useState(false);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);

  const [values, setValues] = useState<ProductFormValues>({
    sku: initial?.sku ?? "",
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    price: initial?.price ?? 0,
    stock: initial?.stock ?? 0,
    minStock: initial?.minStock ?? 10,
    status: initial?.status ?? "In Stock",
  });

  useEffect(() => {
    if (actualOpen) {
      setValues({
        sku: initial?.sku ?? "",
        name: initial?.name ?? "",
        category: initial?.category ?? "",
        price: initial?.price ?? 0,
        stock: initial?.stock ?? 0,
        minStock: initial?.minStock ?? 10,
        status: initial?.status ?? "In Stock",
      });
    }
  }, [actualOpen, initial]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  function buildInitialValues(): ProductFormValues {
    return {
      sku: initial?.sku ?? "",
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      price: initial?.price ?? 0,
      stock: initial?.stock ?? 0,
      minStock: initial?.minStock ?? 10,
      status: initial?.status ?? "In Stock",
    };
  }

  async function handleSkuLookup(sku: string) {
    if (!sku.trim()) return;

    setSkuLookupLoading(true);
    try {
      const product = allProducts.find((p) => p.sku === sku.toUpperCase());
      if (product) {
        setValues((prev) => ({
          ...prev,
          sku: product.sku,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          minStock: product.minStock,
          status: product.status,
        }));
        toast.success(`Product "${product.name}" loaded from existing inventory.`);
      }
    } finally {
      setSkuLookupLoading(false);
    }
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

    // Check if product already exists (for add mode)
    if (mode === "add") {
      const existing = allProducts.find((p) => p.sku === values.sku.trim());
      if (existing) {
        // Product exists - switch to "add to stock" mode
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
            {/* SKU with Lookup */}
            <div className="grid gap-1.5 sm:col-span-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 grid gap-1.5">
                  <Label htmlFor="product-sku">SKU</Label>
                  <Input
                    id="product-sku"
                    type="text"
                    value={values.sku}
                    placeholder="SKU-1001"
                    onChange={(e) => setValues((s) => ({ ...s, sku: e.target.value }))}
                    onBlur={(e) => {
                      if (mode === "add" && e.target.value.trim()) {
                        handleSkuLookup(e.target.value);
                      }
                    }}
                    disabled={mode === "edit"}
                  />
                </div>
                {mode === "add" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkuLookup(values.sku)}
                    disabled={skuLookupLoading || !values.sku.trim()}
                    className="mb-0"
                  >
                    {skuLookupLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Loading…
                      </>
                    ) : (
                      "Lookup"
                    )}
                  </Button>
                )}
              </div>
              {mode === "add" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enter SKU and click Lookup or press Tab to auto-fill existing product details
                </p>
              )}
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
