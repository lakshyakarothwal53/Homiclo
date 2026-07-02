import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Barcode } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { useTableQuery } from "@/components/billing/use-table-query";
import { exportToExcel } from "@/lib/export";
import { formatINR } from "@/components/pos/products";
import { AddPosProductDialog } from "@/components/pos/AddPosProductDialog";
import { BarcodeDialog } from "@/components/pos/BarcodeDialog";
import { usePosBranches, usePosProducts } from "@/hooks/use-pos";
import type { PosProduct } from "@/types/pos";

export const Route = createFileRoute("/_app/pos/search")({
  head: () => ({
    meta: [
      { title: "Product Search — HOMIQLO" },
      { name: "description", content: "Search overview and controls." },
    ],
  }),
  component: Page,
});

function Page() {
  const [branch, setBranch] = useState("all");
  const { data: products = [] } = usePosProducts(undefined, branch);
  const { data: branches = [] } = usePosBranches();
  const { search, setSearch, amountSort, setAmountSort, amountRange, setAmountRange, rows } =
    useTableQuery(products, ["sku", "name", "category"], "price");

  const [addOpen, setAddOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<PosProduct | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  function showBarcode(product: PosProduct) {
    setBarcodeProduct(product);
    setBarcodeOpen(true);
  }

  function handleExport() {
    exportToExcel(
      "pos-product-search",
      ["SKU", "Product", "Category", "Price", "Stock"],
      rows.map((r) => [r.sku, r.name, r.category, r.price, r.stock]),
    );
  }

  const columns: Column<PosProduct>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono text-xs">{r.sku}</span>,
    },
    {
      key: "name",
      header: "Product",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (r) => <span className="text-muted-foreground">{r.category}</span>,
    },
    { key: "price", header: "Price", render: (r) => formatINR(r.price) },
    {
      key: "stock",
      header: "Stock",
      render: (r) => (
        <span className={r.stock <= 10 ? "font-medium text-brand" : "text-foreground"}>
          {r.stock}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => showBarcode(r)}>
            <Barcode className="h-3.5 w-3.5" /> Barcode
          </Button>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => toast.success(`${r.name} added to cart`)}
          >
            Add to Cart
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="POS › Search"
        title="Product Search"
        description="Search overview and controls."
      />
      <FilterBar
        searchPlaceholder="Search..."
        addLabel="Add New"
        onAdd={() => setAddOpen(true)}
        search={search}
        onSearchChange={setSearch}
        onExport={handleExport}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
        amountSort={amountSort}
        onAmountSortChange={setAmountSort}
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.sku} />
      </Card>

      <AddPosProductDialog open={addOpen} onOpenChange={setAddOpen} onCreated={showBarcode} />
      <BarcodeDialog product={barcodeProduct} open={barcodeOpen} onOpenChange={setBarcodeOpen} />
    </>
  );
}
