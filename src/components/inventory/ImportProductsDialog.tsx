import { type ReactNode, useState } from "react";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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
import type { Product } from "@/types/inventory";

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
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  {importResult.success} products imported successfully
                </p>
                {importResult.failed > 0 && (
                  <p className="text-sm text-green-800 mt-1">
                    {importResult.failed} products failed
                  </p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-900">Errors:</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {importResult.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">Row {error.row}</p>
                        <p className="text-red-800">
                          {error.sku}: {error.error}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>CSV Format Required:</strong> SKU, Product, Category, Price (₹), Stock,
                Minimum Stock, Status
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-8">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <label className="cursor-pointer">
                <p className="text-sm font-medium mb-2">
                  Click to select CSV file or drag and drop
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  disabled={isLoading}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                CSV files only. Same format as export.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                <strong>Expected CSV columns:</strong> SKU, Product, Category, Price (₹), Stock,
                Minimum Stock, Status
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Example CSV content:</p>
              <pre className="bg-secondary p-3 rounded text-xs overflow-x-auto">
                {`SKU,Product,Category,Price (₹),Stock,Minimum Stock,Status
SKU-1001,Laptop,Electronics,50000,5,10,Low Stock
SKU-1002,Mouse,Electronics,500,100,20,In Stock
SKU-1003,Keyboard,Electronics,1500,0,25,Out of Stock`}
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
                Select CSV File
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
