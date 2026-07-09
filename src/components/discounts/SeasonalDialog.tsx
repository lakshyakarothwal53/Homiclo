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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiscountStatus } from "./types";
import type { DiscountSeasonInput } from "@/types/discounts";

const STATUSES: DiscountStatus[] = ["Active", "Upcoming", "Expired", "Ended"];

export function SeasonalDialog({
  mode,
  initial,
  trigger,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: DiscountSeasonInput;
  /** Custom trigger element; defaults to the "Add New" button. */
  trigger?: ReactNode;
  onSave: (values: DiscountSeasonInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [season, setSeason] = useState("");
  const [offer, setOffer] = useState("");
  const [discount, setDiscount] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [status, setStatus] = useState<DiscountStatus>("Upcoming");

  function reset() {
    setSeason(initial?.season ?? "");
    setOffer(initial?.offer ?? "");
    setDiscount(initial?.discount ?? "");
    setValidFrom(initial?.validFrom ?? "");
    setValidTo(initial?.validTo ?? "");
    setStatus(initial?.status ?? "Upcoming");
  }

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit() {
    if (!season.trim() || !offer.trim() || !discount.trim()) {
      toast.error("Please fill in the season, offer and discount.");
      return;
    }
    onSave({
      season: season.trim(),
      offer: offer.trim(),
      discount: discount.trim(),
      validFrom: validFrom.trim(),
      validTo: validTo.trim(),
      status,
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
          <DialogTitle>{mode === "add" ? "Add Seasonal Offer" : "Edit Seasonal Offer"}</DialogTitle>
          <DialogDescription>Schedule a festival or seasonal promotion.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="se-season">Season</Label>
              <Input
                id="se-season"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="Diwali"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="se-offer">Offer</Label>
              <Input
                id="se-offer"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="Festive Bonanza"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="se-discount">Discount</Label>
              <Input
                id="se-discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Up to 30%"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="se-from">Valid from</Label>
              <Input
                id="se-from"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                placeholder="01 Nov"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="se-to">Valid to</Label>
              <Input
                id="se-to"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                placeholder="15 Nov"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DiscountStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            {mode === "add" ? "Create offer" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
