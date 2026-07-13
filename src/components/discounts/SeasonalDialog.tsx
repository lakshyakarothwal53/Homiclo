import { type ReactNode, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TargetMultiSelect } from "./TargetMultiSelect";
import type { DiscountStatus, DiscountTarget, DiscountTargetType, DiscountValueType } from "./types";
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

  // "Make this redeemable at checkout" — off by default, matching CampaignDialog.
  const [redeemable, setRedeemable] = useState(false);
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState<DiscountValueType>("percentage");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [cap, setCap] = useState("");
  const [redeemValidFrom, setRedeemValidFrom] = useState("");
  const [redeemValidTo, setRedeemValidTo] = useState("");
  const [appliesToType, setAppliesToType] = useState<DiscountTargetType>("product");
  const [targets, setTargets] = useState<DiscountTarget[]>([]);

  function reset() {
    setSeason(initial?.season ?? "");
    setOffer(initial?.offer ?? "");
    setDiscount(initial?.discount ?? "");
    setValidFrom(initial?.validFrom ?? "");
    setValidTo(initial?.validTo ?? "");
    setStatus(initial?.status ?? "Upcoming");
    setRedeemable(!!initial?.code);
    setCode(initial?.code ?? "");
    // Seasonal Offers doesn't support "bogo" (Campaigns-only feature) — fall
    // back to "percentage" in the unexpected case a row somehow has it set.
    setValueType(initial?.valueType === "flat" ? "flat" : "percentage");
    setValue(initial?.value != null ? String(initial.value) : "");
    setMinOrder(initial?.minOrder ? String(initial.minOrder) : "");
    setCap(initial?.cap != null ? String(initial.cap) : "");
    setRedeemValidFrom(initial?.redeemValidFrom ?? "");
    setRedeemValidTo(initial?.redeemValidTo ?? "");
    setAppliesToType(initial?.appliesToType ?? "product");
    setTargets(initial?.appliesTo ?? []);
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
    if (redeemable && (!code.trim() || !value)) {
      toast.error("Please fill in a code and value, or turn off redemption.");
      return;
    }
    onSave({
      season: season.trim(),
      offer: offer.trim(),
      discount: discount.trim(),
      validFrom: validFrom.trim(),
      validTo: validTo.trim(),
      status,
      code: redeemable ? code.trim().toUpperCase() : null,
      valueType: redeemable ? valueType : null,
      value: redeemable ? Number(value) : null,
      minOrder: redeemable ? Number(minOrder) || 0 : 0,
      cap: redeemable && cap ? Number(cap) : null,
      redeemUsed: initial?.redeemUsed ?? 0,
      redeemValidFrom: redeemable && redeemValidFrom ? redeemValidFrom : null,
      redeemValidTo: redeemable && redeemValidTo ? redeemValidTo : null,
      appliesToType: redeemable ? appliesToType : null,
      appliesTo: redeemable ? targets : [],
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

          <div className="grid gap-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="se-redeemable"
                checked={redeemable}
                onCheckedChange={(c) => setRedeemable(c === true)}
              />
              <Label htmlFor="se-redeemable" className="cursor-pointer">
                Make this redeemable at checkout
              </Label>
            </div>
            {redeemable && (
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="se-code">Code</Label>
                  <Input
                    id="se-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="DIWALI20"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Value type</Label>
                    <Select
                      value={valueType}
                      onValueChange={(v) => setValueType(v as DiscountValueType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="flat">Flat (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="se-value">
                      {valueType === "percentage" ? "Value (%)" : "Value (₹)"}
                    </Label>
                    <Input
                      id="se-value"
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={valueType === "percentage" ? "20" : "100"}
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Discount type</Label>
                    <Select
                      value={appliesToType}
                      onValueChange={(v) => {
                        setAppliesToType(v as DiscountTargetType);
                        setTargets([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="brand">Brand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Applies to</Label>
                    <TargetMultiSelect type={appliesToType} value={targets} onChange={setTargets} />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="se-min">Min. order (₹)</Label>
                    <Input
                      id="se-min"
                      type="number"
                      min={0}
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="se-cap">Usage limit</Label>
                    <Input
                      id="se-cap"
                      type="number"
                      min={0}
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="se-redeem-from">Redeemable from</Label>
                    <Input
                      id="se-redeem-from"
                      type="date"
                      value={redeemValidFrom}
                      onChange={(e) => setRedeemValidFrom(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="se-redeem-to">Redeemable to</Label>
                    <Input
                      id="se-redeem-to"
                      type="date"
                      value={redeemValidTo}
                      onChange={(e) => setRedeemValidTo(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave both dates blank for no expiry. Uses its own dates, independent of "Valid
                  from"/"Valid to" above (those are display text, e.g. "01 Nov" with no year).
                </p>
              </div>
            )}
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
