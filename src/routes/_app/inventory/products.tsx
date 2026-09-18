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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Barcode, Send, Trash2 } from "lucide-react";
import { calculateProductStatus } from "@/lib/inventory-utils";
import { exportProductsToCSV } from "@/lib/export-utils";
import { printBarcodes } from "@/lib/barcode-utils";
import type { Product } from "@/types/inventory";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { useAuth } from "@/components/auth/AuthProvider";
import { canManageCatalogue } from "@/lib/roles";
import { SendToBranchDialog } from "@/components/inventory/SendToBranchDialog";
import {
  useAllocateProduct,
  useBranches,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useAllBranchAllocations,
  useProductAllocations,
  useProducts,
  useUpdateProduct,
  useAddToStock,
  type AddToStockInput,
} from "@/hooks/use-inventory";

/**
 * Per-row "which branch has how much" breakdown. Only meaningful from the
 * Super Admin central view — a branch admin's row IS their own branch's
 * stock already, so there's nothing further to break down. Lazy: the
 * per-branch query only fires once the popover is actually opened, so
 * loading 10 rows of central products doesn't fire 10 extra queries.
 */
function BranchBreakdownCell({ sku }: { sku: string }) {
  const [open, setOpen] = useState(false);
  const { data: allocations = [], isLoading } = useProductAllocations(open ? sku : undefined);
  const total = allocations.reduce((sum, a) => sum + a.stock, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-sm font-medium text-muted-foreground hover:text-brand hover:underline">
          Branches
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Allocated across branches{!isLoading && ` (${total} total)`}
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not sent to any branch yet.</p>
        ) : (
          <div className="space-y-1.5">
            {allocations.map((a) => (
              <div key={a.branch} className="flex items-center justify-between text-sm">
                <span>{a.branch}</span>
                <span className="font-medium">{a.stock}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const Route = createFileRoute("/_app/inventory/products")({
  head: () => ({
    meta: [
      { title: "Products — HOMIQLO" },
      { name: "description", content: "Manage your full product catalog." },
    ],
  }),
  component: Page,
});

const BASE_COLUMNS: Column[] = [
  { key: "sku", label: "SKU" },
  { key: "product", label: "Product" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", align: "right" },
];

// Super Admin's "Stock" is central/unallocated; a branch's is its own holding.
const columnsFor = (
  canManage: boolean,
  scoped: boolean,
  selectAll?: { checked: boolean | "indeterminate"; onChange: (v: boolean) => void },
): Column[] => [
  ...(canManage && selectAll
    ? [
        {
          key: "select",
          label: (
            <Checkbox
              checked={selectAll.checked}
              onCheckedChange={(v) => selectAll.onChange(v === true)}
              aria-label="Select all products on this page"
            />
          ),
        } as Column,
      ]
    : []),
  ...BASE_COLUMNS,
  {
    key: "stock",
    label: canManage && !scoped ? "Central Stock" : "Branch Stock",
    align: "right",
  },
  // Central view only: Central Stock alone is just the unshipped warehouse
  // buffer (often 0 once most of a product has gone out to branches) — Total
  // Stock adds every branch's allocation back on top so the company-wide
  // quantity (3 branches holding 55 + 30 still central = 85) is visible
  // without opening the Branches popover for every row.
  ...(canManage && !scoped
    ? [{ key: "totalStock", label: "Total Stock", align: "right" } as Column]
    : []),
  { key: "status", label: "Status" },
  // Which branch holds how much — only meaningful from the central view; a
  // branch admin's "Branch Stock" column above already IS that answer for
  // their one branch.
  ...(canManage && !scoped
    ? [{ key: "branches", label: "Branches", align: "right" } as Column]
    : []),
  { key: "action", label: "", align: "right" },
];

function toProduct(v: ProductFormValues): Product {
  const status = calculateProductStatus(v.stock, v.minStock);
  return {
    sku: v.sku,
    barcode: v.barcode,
    name: v.name,
    category: v.category,
    price: v.price,
    stock: v.stock,
    minStock: v.minStock,
    status: status,
    gstRate: v.gstRate,
    mrp: v.mrp,
    purchaseRate: v.purchaseRate,
  };
}

const ITEMS_PER_PAGE = 10;

function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const { role } = useAuth();
  // Super Admin and Branch Admin own the catalogue; every other role gets a
  // read-only list of what has been sent to them.
  const canManage = role ? canManageCatalogue(role) : false;
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const { data = [], isLoading } = useProducts(search, branch);
  const { data: branches = [] } = useBranches();
  const { data: categories = [] } = useCategories();
  // Central view only — powers the Total Stock column (central + every
  // branch's allocation for that sku).
  const { data: allBranchAllocations = [] } = useAllBranchAllocations(canManage && !scoped);
  const allocatedBySku = new Map<string, number>();
  allBranchAllocations.forEach((a) => {
    allocatedBySku.set(a.sku, (allocatedBySku.get(a.sku) ?? 0) + (a.stock || 0));
  });

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
  const allocateProduct = useAllocateProduct();

  useEffect(() => {
    setCurrentPage(1);
    // Selection is by SKU and persists across pages, but a filter/branch
    // change swaps out the result set entirely — clear it so a hidden
    // checkbox can't silently carry a stale selection into a bulk delete.
    setSelected(new Set());
  }, [search, branch, minPrice, maxPrice]);

  // Branch Admin's product list is branch-scoped — it reads `branch_inventory`,
  // not central `products.stock` (see useProducts). Without this, a product a
  // Branch Admin just created would land as unallocated central stock and
  // vanish from their own list, since they have no central-stock view to find
  // it in. Auto-allocate the entered stock to their branch via the same
  // atomic RPC the "Send" button uses, so it shows up immediately.
  function allocateToOwnBranch(sku: string, name: string, qty: number) {
    if (!scoped || !homeBranch || qty <= 0) return;
    allocateProduct.mutate(
      { sku, branch: homeBranch, qty },
      {
        onError: (e) =>
          toast.error(
            `${name} was created, but couldn't be allocated to your branch: ${
              e instanceof Error ? e.message : "unknown error"
            }`,
          ),
      },
    );
  }

  function handleCreate(v: ProductFormValues) {
    const row = toProduct(v);
    createProduct.mutate(row, {
      onSuccess: () => {
        toast.success(`${row.name} created.`);
        allocateToOwnBranch(row.sku, row.name, row.stock);
      },
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

  function toggleSelected(sku: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sku);
      else next.delete(sku);
      return next;
    });
  }

  function toggleSelectPage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      paginatedData.forEach((p) => (checked ? next.add(p.sku) : next.delete(p.sku)));
      return next;
    });
  }

  // Products with real sale history (pos_transaction_items) refuse to delete
  // — the DB protects that referential integrity on purpose — so a bulk
  // delete commonly succeeds for some SKUs and fails for others. Each mutate
  // call keeps its own onSuccess/onError (see handleBulkImport above for the
  // same pattern), and a single summary toast fires once every call settles.
  function handleBulkDelete() {
    const skus = [...selected];
    if (skus.length === 0) return;
    let done = 0;
    let succeeded = 0;
    const failures: string[] = [];

    skus.forEach((sku) => {
      deleteProduct.mutate(sku, {
        onSuccess: () => {
          succeeded += 1;
        },
        onError: (e) => {
          failures.push(`${sku} (${e instanceof Error ? e.message : "unknown error"})`);
        },
        onSettled: () => {
          done += 1;
          if (done === skus.length) {
            if (succeeded > 0) toast.success(`Deleted ${succeeded} of ${skus.length} products.`);
            if (failures.length > 0) {
              toast.error(
                `Could not delete ${failures.length} product${failures.length === 1 ? "" : "s"}: ${failures.join(", ")}`,
              );
            }
          }
        },
      });
    });

    setSelected(new Set());
    setBulkDeleteOpen(false);
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
          allocateToOwnBranch(product.sku, product.name, product.stock);
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

  const pageSkus = paginatedData.map((p) => p.sku);
  const allPageSelected = pageSkus.length > 0 && pageSkus.every((sku) => selected.has(sku));
  const somePageSelected = pageSkus.some((sku) => selected.has(sku));

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description="Products overview and controls."
        actions={
          <>
            {canManage && selected.size > 0 && (
              <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Delete Selected ({selected.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selected.size} products?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes all {selected.size} selected records. This action
                      cannot be undone. Products with existing sales history can't be deleted and
                      will be skipped.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={handleBulkDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
          </>
        }
      />
      {/* Catalogue mutations (Add New / Import) are Super Admin / Branch Admin
          only: other branch roles receive stock from the centre or their
          branch admin rather than creating their own. */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        onExport={handleExport}
        {...(canManage
          ? {
              primaryLabel: "Add New",
              onPrimary: () => setAddOpen(true),
              onImport: () => setImportOpen(true),
            }
          : {})}
        {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
      />

      {canManage && (
        <>
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
        </>
      )}

      <DataTableCard
        columns={columnsFor(canManage, scoped, {
          checked: allPageSelected ? true : somePageSelected ? "indeterminate" : false,
          onChange: toggleSelectPage,
        })}
        isLoading={isLoading}
        count={filteredByPrice.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {paginatedData.map((p) => (
          <TableRow key={p.sku} className="border-t border-border">
            {canManage && (
              <TableCell className="px-5 py-3">
                <Checkbox
                  checked={selected.has(p.sku)}
                  onCheckedChange={(v) => toggleSelected(p.sku, v === true)}
                  aria-label={`Select ${p.sku}`}
                />
              </TableCell>
            )}
            <TableCell className="px-5 py-3 font-mono text-xs">{p.sku}</TableCell>
            <TableCell className="px-5 py-3 font-medium">{p.name}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{p.category}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              ₹{p.price.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="px-5 py-3 text-right">{p.stock}</TableCell>
            {canManage && !scoped && (
              <TableCell className="px-5 py-3 text-right font-medium">
                {p.stock + (allocatedBySku.get(p.sku) ?? 0)}
              </TableCell>
            )}
            <TableCell className="px-5 py-3">
              <InventoryStatusBadge status={p.status} />
            </TableCell>
            {canManage && !scoped && (
              <TableCell className="px-5 py-3 text-right">
                <BranchBreakdownCell sku={p.sku} />
              </TableCell>
            )}
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <button
                  className="text-sm font-medium text-muted-foreground hover:text-brand hover:underline"
                  onClick={() => printBarcodes([p])}
                >
                  Barcode
                </button>
                {canManage && (
                  <>
                    <SendToBranchDialog
                      product={p}
                      branches={branches}
                      trigger={
                        <button className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                          <Send className="h-3.5 w-3.5" /> Send
                        </button>
                      }
                    />
                    <ProductFormDialog
                      mode="edit"
                      title="Edit Product"
                      categories={categories.map((c) => c.name)}
                      allProducts={data}
                      initial={p}
                      trigger={
                        <button className="text-sm font-medium text-brand hover:underline">
                          Edit
                        </button>
                      }
                      onSave={(v) => handleUpdate(p.sku, v)}
                      onAddToStock={handleAddToStock}
                    />
                    <DeleteConfirm label={p.sku} onConfirm={() => handleDelete(p.sku)} />
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
