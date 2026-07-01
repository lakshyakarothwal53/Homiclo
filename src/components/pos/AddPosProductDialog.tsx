import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generatePosSku } from "./products";
import { useCreatePosProduct } from "@/hooks/use-pos";
import type { PosProduct } from "@/types/pos";

export function AddPosProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created product so the caller can show/print its barcode. */
  onCreated: (product: PosProduct) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const createProduct = useCreatePosProduct();

  function reset() {
    setName("");
    setCategory("");
    setPrice("");
    setStock("");
  }

  function submit() {
    if (!name.trim() || !category.trim() || !price) {
      toast.error("Please fill in product name, category and price.");
      return;
    }
    const product: PosProduct = {
      sku: generatePosSku(),
      name: name.trim(),
      category: category.trim(),
      price: Number(price) || 0,
      stock: Number(stock) || 0,
    };
    createProduct.mutate(product, {
      onSuccess: () => {
        toast.success(`${product.name} added · barcode ${product.sku} ready to print`);
        reset();
        onOpenChange(false);
        onCreated(product);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create product."),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            A barcode is generated automatically from the SKU — print it after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Product Name</Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cotton T-Shirt L"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-category">Category</Label>
              <Input
                id="p-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Apparel"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">Price (₹)</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="599"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-stock">Stock</Label>
            <Input
              id="p-stock"
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={createProduct.isPending}
            onClick={submit}
          >
            {createProduct.isPending ? "Saving…" : "Save & Generate Barcode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
