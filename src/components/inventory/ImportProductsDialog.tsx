import { type ReactNode, useState } from "react";
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { parseCSVFile, validateImportRow, type ImportResult } from "@/lib/import-utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/inventory";

const REQUIRED_COLUMNS = [
  "SKU",
  "Product",
  "Category",
  "Price (₹)",
  "MRP (₹)",
  "Purchase Rate (₹)",
  "GST Rate (%)",
  "Stock",
  "Minimum Stock",
  "Status",
];

const EXAMPLE_CSV = `SKU,Product,Category,Price (₹),MRP (₹),Purchase Rate (₹),GST Rate (%),Stock,Minimum Stock,Status
SKU-1001,Laptop,Electronics,50000,54999,42000,18,5,10,Low Stock
SKU-1002,Mouse,Electronics,500,699,350,18,100,20,In Stock
SKU-1003,Keyboard,Electronics,1500,1999,1100,18,0,25,Out of Stock`;

/** Every column, listed as compact pills in a fixed grid instead of a
 * ragged flex-wrap (whose last row was left short and uneven) or a long
 * comma-separated sentence. */
function RequiredColumns() {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {REQUIRED_COLUMNS.map((c) => (
        <Badge
          key={c}
          variant="secondary"
          className="justify-start truncate font-normal"
          title={c}
        >
          {c}
        </Badge>
      ))}
    </div>
  );
}

export function ImportProductsDialog({
  trigger,
  open,
  onOpenChange,
  onImport,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onImport: (products: Product[]) => void;
}) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? open : internalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  async function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setIsLoading(true);
    try {
      const rows = await parseCSVFile(file);
      const products: Product[] = [];
      const errors: ImportResult["errors"] = [];

      rows.forEach((row, index) => {
        if (!row.sku && !row.product) return; // Skip empty rows

        const validation = validateImportRow(row, index + 2); // +2 for header + 1-indexed
        if (validation.valid) {
          products.push(validation.product);
        } else {
          errors.push({
            row: index + 2,
            sku: row.sku || "Unknown",
            error: validation.error,
          });
        }
      });

      const result: ImportResult = {
        success: products.length,
        failed: errors.length,
        errors,
      };

      setImportResult(result);

      if (products.length > 0) {
        onImport(products);
        toast.success(`Successfully imported ${products.length} products`);

        if (errors.length > 0) {
          toast.error(`${errors.length} products failed to import`);
        }
      } else {
        toast.error("No valid products found in file");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import file");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setImportResult(null);
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with the same structure as the export file
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className="space-y-4 py-2">
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                importResult.success > 0
                  ? "border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)]"
                  : "border-destructive/30 bg-destructive/5",
              )}
            >
              {importResult.success > 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--success)]" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {importResult.success} product{importResult.success === 1 ? "" : "s"} imported
                  successfully
                </p>
                {importResult.failed > 0 && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {importResult.failed} row{importResult.failed === 1 ? "" : "s"} failed —
                    see below
                  </p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Errors</p>
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-1.5">
                  {importResult.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-md bg-destructive/5 px-3 py-2 text-sm"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <p className="text-foreground">
                        <span className="font-medium">Row {error.row}</span>
                        <span className="text-muted-foreground"> · {error.sku} — </span>
                        {error.error}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Required columns — every one needs a value
                  </p>
                  <RequiredColumns />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-border p-8 text-center transition",
                "hover:border-brand/50 hover:bg-secondary/30",
                isLoading && "pointer-events-none opacity-60",
              )}
            >
              <Upload className="mb-2 h-9 w-9 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Click to select a CSV file, or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">Same format as export · .csv only</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                disabled={isLoading}
                className="hidden"
              />
            </label>

            <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Required columns — every one needs a value, or the row is rejected
              </p>
              <RequiredColumns />
            </div>

            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Example CSV content
              </p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/30 p-3 font-mono text-xs leading-relaxed text-foreground">
                {EXAMPLE_CSV}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {importResult ? "Done" : "Cancel"}
          </Button>
          {!importResult && (
            <label>
              <Button
                disabled={isLoading}
                className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Upload className="h-4 w-4" />
                {isLoading ? "Importing…" : "Select CSV File"}
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                disabled={isLoading}
                className="hidden"
              />
            </label>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
