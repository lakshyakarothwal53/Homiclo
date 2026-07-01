import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { CategoryDialog } from "@/components/inventory/CategoryDialog";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { exportToExcel } from "@/lib/export";
import {
  useBranches,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type CategoryInput,
} from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/categories")({
  head: () => ({
    meta: [
      { title: "Categories — HOMIQLO" },
      { name: "description", content: "Organize products into categories." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "category", label: "Category" },
  { key: "products", label: "Products" },
  { key: "value", label: "Stock Value" },
  { key: "updated", label: "Last Updated" },
  { key: "action", label: "", align: "right" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading } = useCategories(search, branch);
  const { data: branches = [] } = useBranches();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  function handleCreate(values: CategoryInput) {
    createCategory.mutate(values, {
      onSuccess: () => toast.success(`${values.name} created.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create category."),
    });
  }

  function handleUpdate(originalName: string, values: CategoryInput) {
    updateCategory.mutate(
      { ...values, originalName },
      {
        onSuccess: () => toast.success(`${values.name} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update category."),
      },
    );
  }

  function handleDelete(name: string) {
    deleteCategory.mutate(name, {
      onSuccess: () => toast.success(`${name} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete category."),
    });
  }

  function handleExport() {
    exportToExcel(
      "categories",
      ["Category", "Products", "Stock Value", "Last Updated"],
      data.map((c) => [c.name, c.productCount, c.stockValue, c.lastUpdated]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Categories"
        description="Categories overview and controls."
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories…"
        primaryLabel="Add New"
        onPrimary={() => setAddOpen(true)}
        onExport={handleExport}
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
      />

      <CategoryDialog mode="add" open={addOpen} onOpenChange={setAddOpen} onSave={handleCreate} />

      <DataTableCard columns={COLUMNS} isLoading={isLoading} count={data.length}>
        {data.map((c) => (
          <TableRow key={c.name} className="border-t border-border">
            <TableCell className="px-5 py-3 font-medium">{c.name}</TableCell>
            <TableCell className="px-5 py-3">{c.productCount}</TableCell>
            <TableCell className="px-5 py-3">{c.stockValue}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{c.lastUpdated}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <CategoryDialog
                  mode="edit"
                  initial={c}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                  onSave={(values) => handleUpdate(c.name, values)}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-sm font-medium text-muted-foreground hover:text-destructive hover:underline">
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{c.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the category. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => handleDelete(c.name)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
