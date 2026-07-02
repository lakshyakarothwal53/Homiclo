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
  const { data: products = [] } = usePosProducts();
  const { search, setSearch, amountSort, setAmountSort, amountRange, setAmountRange, rows } =
    useTableQuery(products, ["sku", "name", "category"], "price");

  function handleExport() {
    exportToExcel(
      "pos-product-search",
      ["SKU", "Product", "Category", "Price", "Stock"],
      rows.map((r) => [r.sku, r.name, r.category, r.price, r.stock]),
    );
  }

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
        onAdd={() => toast.info("Open new product form")}
        search={search}
        onSearchChange={setSearch}
        onExport={handleExport}
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
