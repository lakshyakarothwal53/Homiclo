import { type ReactNode, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { DiscountStatus, DiscountTarget, DiscountTargetType } from "./types";
import type { DiscountCampaignInput } from "@/types/discounts";

const STATUSES: DiscountStatus[] = ["Active", "Upcoming", "Ended"];

export function CampaignDialog({
  mode,
  initial,
  trigger,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: DiscountCampaignInput;
  /** Custom trigger element; defaults to the "New Campaign" button. */
  trigger?: ReactNode;
  onSave: (values: DiscountCampaignInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [validTill, setValidTill] = useState("");
  const [used, setUsed] = useState("");
  const [status, setStatus] = useState<DiscountStatus>("Active");

  // "Make this redeemable at checkout" — off by default so a plain marketing
  // campaign never gains a POS-facing coupon by accident.
  const [redeemable, setRedeemable] = useState(false);
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState<"percentage" | "flat" | "bogo">("percentage");
  const [value, setValue] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [getQty, setGetQty] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [cap, setCap] = useState("");
  const [redeemValidFrom, setRedeemValidFrom] = useState("");
  const [redeemValidTo, setRedeemValidTo] = useState("");
  const [appliesToType, setAppliesToType] = useState<DiscountTargetType>("product");
  const [targets, setTargets] = useState<DiscountTarget[]>([]);

  function reset() {
    setName(initial?.name ?? "");
    setBlurb(initial?.blurb ?? "");
    setValidTill(initial?.validTill ?? "");
    setUsed(initial?.used ?? "—");
    setStatus(initial?.status ?? "Active");
    setRedeemable(!!initial?.code);
    setCode(initial?.code ?? "");
    setValueType(initial?.valueType ?? "percentage");
    setValue(initial?.value != null ? String(initial.value) : "");
    setBuyQty(initial?.buyQty != null ? String(initial.buyQty) : "");
    setGetQty(initial?.getQty != null ? String(initial.getQty) : "");
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
    if (!name.trim() || !blurb.trim()) {
      toast.error("Please fill in the campaign name and description.");
      return;
    }
    const isBogo = valueType === "bogo";
    if (redeemable && !code.trim()) {
      toast.error("Please fill in a code, or turn off redemption.");
      return;
    }
    if (redeemable && isBogo && (!buyQty || !getQty)) {
      toast.error("Please fill in the buy and get quantities, or turn off redemption.");
      return;
    }
    if (redeemable && !isBogo && !value) {
      toast.error("Please fill in a value, or turn off redemption.");
      return;
    }
    onSave({
      name: name.trim(),
      blurb: blurb.trim(),
      validTill: validTill.trim() || "—",
      used: used.trim() || "—",
      status,
      code: redeemable ? code.trim().toUpperCase() : null,
      valueType: redeemable ? valueType : null,
      value: redeemable && !isBogo ? Number(value) : null,
      buyQty: redeemable && isBogo ? Number(buyQty) : null,
      getQty: redeemable && isBogo ? Number(getQty) : null,
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
          <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "New Campaign" : "Edit Campaign"}</DialogTitle>
          <DialogDescription>Configure the promotional campaign and its status.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cp-name">Name</Label>
            <Input
              id="cp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Diwali Bonanza"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-blurb">Description</Label>
            <Textarea
              id="cp-blurb"
              rows={2}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="Flat 20% off across all categories."
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cp-till">Valid till</Label>
              <Input
                id="cp-till"
                value={validTill}
                onChange={(e) => setValidTill(e.target.value)}
                placeholder="15 Nov"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cp-used">Used</Label>
              <Input
                id="cp-used"
                value={used}
                onChange={(e) => setUsed(e.target.value)}
                placeholder="0"
              />
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

          <div className="grid gap-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="cp-redeemable"
                checked={redeemable}
                onCheckedChange={(c) => setRedeemable(c === true)}
              />
              <Label htmlFor="cp-redeemable" className="cursor-pointer">
                Make this redeemable at checkout
              </Label>
            </div>
            {redeemable && (
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cp-code">Code</Label>
                  <Input
                    id="cp-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="DIWALI20"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Value type</Label>
                  <Select
                    value={valueType}
                    onValueChange={(v) => setValueType(v as "percentage" | "flat" | "bogo")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat (₹)</SelectItem>
                      <SelectItem value="bogo">Buy X Get Y Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {valueType === "bogo" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="cp-buy-qty">Buy quantity</Label>
                      <Input
                        id="cp-buy-qty"
                        type="number"
                        min={1}
                        value={buyQty}
                        onChange={(e) => setBuyQty(e.target.value)}
                        placeholder="2"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="cp-get-qty">Get free quantity</Label>
                      <Input
                        id="cp-get-qty"
                        type="number"
                        min={1}
                        value={getQty}
                        onChange={(e) => setGetQty(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor="cp-value">
                      {valueType === "percentage" ? "Value (%)" : "Value (₹)"}
                    </Label>
                    <Input
                      id="cp-value"
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={valueType === "percentage" ? "20" : "100"}
                    />
                  </div>
                )}

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
                {valueType === "bogo" && (
                  <p className="-mt-1 text-xs text-muted-foreground">
                    Leave "Applies to" empty for a store-wide offer (any product counts toward the
                    bundle), or pick specific products/categories — e.g. "on selected apparel."
                  </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cp-min">Min. order (₹)</Label>
                    <Input
                      id="cp-min"
                      type="number"
                      min={0}
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cp-cap">Usage limit</Label>
                    <Input
                      id="cp-cap"
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
                    <Label htmlFor="cp-redeem-from">Redeemable from</Label>
                    <Input
                      id="cp-redeem-from"
                      type="date"
                      value={redeemValidFrom}
                      onChange={(e) => setRedeemValidFrom(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cp-redeem-to">Redeemable to</Label>
                    <Input
                      id="cp-redeem-to"
                      type="date"
                      value={redeemValidTo}
                      onChange={(e) => setRedeemValidTo(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave both dates blank for no expiry (works even when "Valid till" above is
                  non-date text like "Recurring").
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
            {mode === "add" ? "Create campaign" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
