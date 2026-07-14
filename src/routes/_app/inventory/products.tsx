import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { DeleteConfirm } from "@/components/inventory/DeleteConfirm";
import {
  ProductFormDialog,
  type ProductFormValues,
} from "@/components/inventory/ProductFormDialog";
import { ImportProductsDialog } from "@/components/inventory/ImportProductsDialog";
import { FilterBar } from "@/components/inventory/FilterBar";
import { InventoryStatusBadge } from "@/components/inventory/InventoryStatusBadge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Barcode } from "lucide-react";
import { calculateProductStatus } from "@/lib/inventory-utils";
import { exportProductsToCSV } from "@/lib/export-utils";
import { printBarcodes } from "@/lib/barcode-utils";
import type { Product } from "@/types/inventory";
import { useBranchScope } from "@/hooks/use-branch-scope";
import {
  useBranches,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
  useAddToStock,
  type AddToStockInput,
} from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/products")({
  head: () => ({
    meta: [
      { title: "Products — HOMIQLO" },
      { name: "description", content: "Manage your full product catalog." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "sku", label: "SKU" },
  { key: "product", label: "Product" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", align: "right" },
  { key: "stock", label: "Stock", align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "", align: "right" },
];

function toProduct(v: ProductFormValues): Product {
  const status = calculateProductStatus(v.stock, v.minStock);
  return {
    sku: v.sku,
    name: v.name,
    category: v.category,
    price: v.price,
    stock: v.stock,
    minStock: v.minStock,
    status: status,
  };
}

const ITEMS_PER_PAGE = 10;

function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const { data = [], isLoading } = useProducts(search, branch);
  const { data: branches = [] } = useBranches();
  const { data: categories = [] } = useCategories();

  // Filter by price range
  const filteredByPrice = data.filter((p) => {
    if (minPrice && p.price < minPrice) return false;
    if (maxPrice && p.price > maxPrice) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredByPrice.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredByPrice.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const addToStock = useAddToStock();

  useEffect(() => {
    setCurrentPage(1);
  }, [search, branch, minPrice, maxPrice]);

  function handleCreate(v: ProductFormValues) {
    const row = toProduct(v);
    createProduct.mutate(row, {
      onSuccess: () => toast.success(`${row.name} created.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create product."),
    });
  }

  function handleUpdate(originalSku: string, v: ProductFormValues) {
    const row = toProduct(v);
    updateProduct.mutate(
      { ...row, originalSku },
      {
        onSuccess: () => toast.success(`${row.name} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update product."),
      },
    );
  }

  function handleDelete(sku: string) {
    deleteProduct.mutate(sku, {
      onSuccess: () => toast.success(`${sku} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete product."),
    });
  }

  function handleAddToStock(input: AddToStockInput) {
    addToStock.mutate(input, {
      onSuccess: () => toast.success(`Added ${input.addStock} units to stock.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add to stock."),
    });
  }

  function handleExport() {
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `products_${timestamp}.csv`;
    exportProductsToCSV(filteredByPrice, filename);
    toast.success(`Exported ${filteredByPrice.length} products to ${filename}`);
  }

  function handleBulkImport(products: Product[]) {
    products.forEach((product) => {
      createProduct.mutate(product, {
        onSuccess: () => {
          // Silent success - final toast shown after all imports
        },
        onError: (e) => {
          toast.error(
            `Failed to create ${product.name}: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
        },
      });
    });

    setImportOpen(false);
    toast.success(`Importing ${products.length} products...`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description="Products overview and controls."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (filteredByPrice.length === 0) {
                toast.error("No products to print.");
                return;
              }
              printBarcodes(filteredByPrice);
            }}
          >
            <Barcode className="h-4 w-4" /> Print Barcodes
          </Button>
        }
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        primaryLabel="Add New"
        onPrimary={() => setAddOpen(true)}
        onExport={handleExport}
        onImport={() => setImportOpen(true)}
        {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
      />

      <ImportProductsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleBulkImport}
      />

      <ProductFormDialog
        mode="add"
        title="Add Product"
        description="Create a new product in the catalog."
        categories={categories.map((c) => c.name)}
        allProducts={data}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleCreate}
        onAddToStock={handleAddToStock}
      />

      <DataTableCard
        columns={COLUMNS}
        isLoading={isLoading}
        count={filteredByPrice.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {paginatedData.map((p) => (
          <TableRow key={p.sku} className="border-t border-border">
            <TableCell className="px-5 py-3 font-mono text-xs">{p.sku}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{p.name}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{p.category}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              ₹{p.price.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="px-5 py-3 text-right">{p.stock}</TableCell>
            <TableCell className="px-5 py-3">
              <InventoryStatusBadge status={p.status} />
            </TableCell>
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <button
                  className="text-sm font-medium text-muted-foreground hover:text-brand hover:underline"
                  onClick={() => printBarcodes([p])}
                >
                  Barcode
                </button>
                <ProductFormDialog
                  mode="edit"
                  title="Edit Product"
                  categories={categories.map((c) => c.name)}
                  allProducts={data}
                  initial={p}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                  onSave={(v) => handleUpdate(p.sku, v)}
                  onAddToStock={handleAddToStock}
                />
                <DeleteConfirm label={p.sku} onConfirm={() => handleDelete(p.sku)} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
