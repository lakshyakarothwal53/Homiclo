import { useState } from "react";
import { toast } from "sonner";
import { Send, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllocateProduct, useProductAllocations, useRecallProduct } from "@/hooks/use-inventory";
import type { Product } from "@/types/inventory";

/**
 * Super-Admin-only: send units of a product from central stock out to a
 * branch, or pull them back. Product facts are never copied — only the
 * quantity moves (see supabase/17_branch_inventory.sql).
 */
export function SendToBranchDialog({
  product,
  branches,
  trigger,
}: {
  product: Product;
  branches: string[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState("");
  const [qty, setQty] = useState("");

  const { data: allocations = [] } = useProductAllocations(open ? product.sku : undefined);
  const allocate = useAllocateProduct();
  const recall = useRecallProduct();
  const busy = allocate.isPending || recall.isPending;

  const allocatedTotal = allocations.reduce((sum, a) => sum + a.stock, 0);
  const atSelectedBranch = allocations.find((a) => a.branch === branch)?.stock ?? 0;

  function run(mode: "allocate" | "recall") {
    const n = parseInt(qty, 10);
    if (!branch) {
      toast.error("Choose a branch first.");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }
    const mutation = mode === "allocate" ? allocate : recall;
    mutation.mutate(
      { sku: product.sku, branch, qty: n },
      {
        onSuccess: (res) => {
          toast.success(
            mode === "allocate"
              ? `Sent ${n} × ${product.name} to ${branch}. Central stock left: ${res?.central_stock ?? "—"}.`
              : `Recalled ${n} × ${product.name} from ${branch}. Central stock: ${res?.central_stock ?? "—"}.`,
          );
          setQty("");
        },
        // The RPC raises a descriptive error (e.g. insufficient stock) — show it.
        onError: (e) => toast.error(e instanceof Error ? e.message : "Transfer failed."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send “{product.name}” to a branch</DialogTitle>
          <DialogDescription>
            Moves units out of central stock into the branch's own inventory. Branch staff see only
            what has been sent to them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Available centrally</span>
            <span className="font-semibold">{product.stock}</span>
          </div>

          <div>
            <Label className="text-sm font-medium">Branch *</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches
                  .filter((b) => b && b !== "all" && b !== "All Branches")
                  .map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {!!branch && (
              <p className="mt-1 text-xs text-muted-foreground">
                {branch} currently holds <strong>{atSelectedBranch}</strong>.
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Quantity *</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 20"
              className="mt-1 h-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => run("allocate")}
              disabled={busy}
              className="flex-1 gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Send className="h-4 w-4" />
              {allocate.isPending ? "Sending…" : "Send to branch"}
            </Button>
            <Button
              variant="outline"
              onClick={() => run("recall")}
              disabled={busy || atSelectedBranch === 0}
              className="gap-2"
            >
              <Undo2 className="h-4 w-4" />
              Recall
            </Button>
          </div>

          {allocations.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                Allocated across branches ({allocatedTotal} total)
              </p>
              {allocations.map((a) => (
                <div key={a.branch} className="flex items-center justify-between text-sm">
                  <span>{a.branch}</span>
                  <span className="font-medium">{a.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
