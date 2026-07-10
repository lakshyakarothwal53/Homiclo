import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/billing/FilterBar";
import { DataTable, type Column } from "@/components/billing/DataTable";
import { EntriesFooter } from "@/components/billing/EntriesFooter";
import { formatINR } from "@/components/pos/products";
import { useCart } from "@/components/pos/CartProvider";
import { usePagination } from "@/hooks/use-pagination";
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
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data: rows = [] } = usePosProducts(search, branch);
  const { data: branches = [] } = usePosBranches();
  const { page, setPage, totalPages, pageItems } = usePagination(rows);
  const { addToCart } = useCart();

  // The cart is shared across all POS pages (CartProvider on the /pos layout),
  // so adding here shows up on the POS Dashboard when the cashier checks out.
  function addProduct(product: PosProduct) {
    addToCart(product);
    toast.success(`${product.name} added to cart.`);
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
        <Button
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => addProduct(r)}
        >
          Add to Cart
        </Button>
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
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or SKU..."
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />
      <Card className="overflow-hidden border-border">
        <DataTable columns={columns} rows={pageItems} rowKey={(r) => r.sku} />
        <EntriesFooter
          total={rows.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
    </>
  );
}
