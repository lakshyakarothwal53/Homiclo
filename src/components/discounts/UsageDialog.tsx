import { type ReactNode, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DiscountUsageInput } from "@/types/discounts";

export function UsageDialog({
  mode,
  initial,
  trigger,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: DiscountUsageInput;
  /** Custom trigger element; defaults to the "Add New" button. */
  trigger?: ReactNode;
  onSave: (values: DiscountUsageInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [discount, setDiscount] = useState("");
  const [code, setCode] = useState("");
  const [timesUsed, setTimesUsed] = useState("");
  const [discountGiven, setDiscountGiven] = useState("");
  const [avgOrder, setAvgOrder] = useState("");
  const [conversion, setConversion] = useState("");

  function reset() {
    setDiscount(initial?.discount ?? "");
    setCode(initial?.code ?? "");
    setTimesUsed(initial ? String(initial.timesUsed) : "");
    setDiscountGiven(initial ? String(initial.discountGiven) : "");
    setAvgOrder(initial ? String(initial.avgOrder) : "");
    setConversion(initial ? String(initial.conversion) : "");
  }

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit() {
    if (!discount.trim() || !code.trim()) {
      toast.error("Please fill in the discount name and code.");
      return;
    }
    onSave({
      discount: discount.trim(),
      code: code.trim().toUpperCase(),
      timesUsed: Number(timesUsed) || 0,
      discountGiven: Number(discountGiven) || 0,
      avgOrder: Number(avgOrder) || 0,
      conversion: Number(conversion) || 0,
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-9 gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="h-4 w-4" /> Add New
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Usage Record" : "Edit Usage Record"}</DialogTitle>
          <DialogDescription>Record redemption analytics for a discount.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="us-discount">Discount</Label>
              <Input
                id="us-discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Diwali Bonanza"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="us-code">Code</Label>
              <Input
                id="us-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="DIWALI20"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="us-times">Times used</Label>
              <Input
                id="us-times"
                type="number"
                min={0}
                value={timesUsed}
                onChange={(e) => setTimesUsed(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="us-given">Discount given (₹)</Label>
              <Input
                id="us-given"
                type="number"
                min={0}
                value={discountGiven}
                onChange={(e) => setDiscountGiven(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="us-avg">Avg. order (₹)</Label>
              <Input
                id="us-avg"
                type="number"
                min={0}
                value={avgOrder}
                onChange={(e) => setAvgOrder(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="us-conv">Conversion (%)</Label>
              <Input
                id="us-conv"
                type="number"
                min={0}
                max={100}
                value={conversion}
                onChange={(e) => setConversion(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            {mode === "add" ? "Add record" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
