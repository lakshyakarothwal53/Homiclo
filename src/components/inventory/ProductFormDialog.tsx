import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scan } from "lucide-react";

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
import { useFetchProductByBarcode } from "@/hooks/use-inventory";
import type { Product } from "@/types/inventory";

// The statutory Indian GST slabs.
const GST_SLABS = [0, 5, 12, 18, 28] as const;

export type ProductFormValues = {
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  status: string;
  /** GST percent; undefined = use the flat POS rate. */
  gstRate?: number;
  /** MRP printed on the pack — display-only. */
  mrp?: number;
  /** Cost price paid to the supplier — display-only, never charged to the customer. */
  purchaseRate?: number;
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
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { refetch: fetchByBarcode } = useFetchProductByBarcode(barcodeInput);

  function buildInitialValues(): ProductFormValues {
    return {
      sku: initial?.sku ?? (mode === "add" ? generateSku() : ""),
      barcode: initial?.barcode ?? "",
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      price: initial?.price ?? 0,
      stock: initial?.stock ?? 0,
      minStock: initial?.minStock ?? 10,
      status: initial?.status ?? "In Stock",
      gstRate: initial?.gstRate,
      mrp: initial?.mrp,
      purchaseRate: initial?.purchaseRate,
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

  async function handleBarcodeInput(rawBarcode: string) {
    const barcode = rawBarcode.trim();
    if (!barcode) return;
    setIsScanning(true);
    try {
      const { data } = await fetchByBarcode();
      if (data) {
        setValues((s) => ({
          ...s,
          barcode: data.barcode || barcode,
          name: data.name,
          category: data.category,
          price: data.price,
          stock: data.stock,
          minStock: data.minStock,
          status: data.status,
          gstRate: data.gstRate,
          mrp: data.mrp,
          purchaseRate: data.purchaseRate,
        }));
        toast.success(`Product "${data.name}" loaded from barcode.`);
      } else {
        setValues((s) => ({ ...s, barcode }));
        toast.error(`No product found for barcode "${barcode}". You can add it as a new product.`);
      }
    } catch (error) {
      toast.error("Failed to fetch product details.");
      console.error(error);
    } finally {
      setBarcodeInput("");
      setIsScanning(false);
      barcodeInputRef.current?.focus();
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
      barcode: values.barcode?.trim(),
      name: values.name.trim(),
      category: values.category,
      price: values.price,
      stock: values.stock,
      minStock: values.minStock,
      status: values.status,
      gstRate: values.gstRate,
      mrp: values.mrp,
      purchaseRate: values.purchaseRate,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            {/* SKU — auto-generated internal identifier */}
            <div className="grid gap-1.5 sm:col-span-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 grid gap-1.5">
                  <Label htmlFor="product-sku">SKU (Internal ID)</Label>
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
                Auto-generated internal product identifier.
              </p>
            </div>

            {/* Barcode — scannable product code */}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="product-barcode">Barcode (Scannable)</Label>
              <div className="flex gap-2">
                <Input
                  id="product-barcode"
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  placeholder="Scan or enter barcode…"
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBarcodeInput(barcodeInput);
                    }
                  }}
                  disabled={isScanning}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleBarcodeInput(barcodeInput)}
                  disabled={isScanning || !barcodeInput.trim()}
                  className="mb-0 gap-2"
                >
                  <Scan className="h-4 w-4" />
                  <span className="hidden sm:inline">Load</span>
                </Button>
              </div>
              <div className="grid gap-2">
                <div className="rounded bg-secondary/50 p-3">
                  <p className="text-xs font-medium text-foreground">Product Barcode</p>
                  <Input
                    type="text"
                    value={values.barcode ?? ""}
                    placeholder="Barcode from scanned product"
                    onChange={(e) => setValues((s) => ({ ...s, barcode: e.target.value }))}
                    className="mt-1 text-sm bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The actual barcode printed on the product — this is what the POS scanner looks for.
                  </p>
                </div>
              </div>
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
              <Label htmlFor="product-price">Selling Price (₹, incl. GST)</Label>
              <Input
                id="product-price"
                type="number"
                value={values.price}
                placeholder="499"
                onChange={(e) => setValues((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                GST is already included in this price — the bill splits it out as CGST + SGST.
              </p>
            </div>

            {/* MRP — printed on the bill so the customer sees their saving. */}
            <div className="grid gap-1.5">
              <Label htmlFor="product-mrp">MRP (₹)</Label>
              <Input
                id="product-mrp"
                type="number"
                value={values.mrp ?? ""}
                placeholder="Optional — printed on the bill"
                onChange={(e) =>
                  setValues((s) => ({
                    ...s,
                    mrp: e.target.value === "" ? undefined : Number(e.target.value) || 0,
                  }))
                }
              />
            </div>

            {/* Purchase Rate — cost price, for margin/valuation only. */}
            <div className="grid gap-1.5">
              <Label htmlFor="product-purchase-rate">Purchase Rate (₹)</Label>
              <Input
                id="product-purchase-rate"
                type="number"
                value={values.purchaseRate ?? ""}
                placeholder="Optional — cost price from supplier"
                onChange={(e) =>
                  setValues((s) => ({
                    ...s,
                    purchaseRate: e.target.value === "" ? undefined : Number(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Never charged to the customer — used for margin and stock valuation only.
              </p>
            </div>

            {/* GST slab */}
            <div className="grid gap-1.5">
              <Label htmlFor="product-gst">GST Rate</Label>
              <Select
                value={values.gstRate === undefined ? "default" : String(values.gstRate)}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, gstRate: v === "default" ? undefined : Number(v) }))
                }
              >
                <SelectTrigger id="product-gst">
                  <SelectValue placeholder="Select GST rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use default POS rate</SelectItem>
                  {GST_SLABS.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to split the GST already included in the selling price into CGST + SGST.
                "Default" falls back to the flat rate in POS Settings.
              </p>
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
