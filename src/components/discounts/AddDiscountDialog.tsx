import { useState } from "react";
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
import { computeStatus, type DiscountValueType, type PromoRow } from "./types";

export function AddDiscountDialog({
  triggerLabel = "Add New",
  title,
  lockType,
  onAdd,
}: {
  triggerLabel?: string;
  title: string;
  /** When set, the type is fixed (Flat / Percentage pages). */
  lockType?: DiscountValueType;
  onAdd: (row: PromoRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState<DiscountValueType>(lockType ?? "percentage");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [cap, setCap] = useState("");

  function reset() {
    setName("");
    setCode("");
    setValueType(lockType ?? "percentage");
    setValue("");
    setMinOrder("");
    setValidFrom("");
    setValidTo("");
    setCap("");
  }

  function submit() {
    if (!name.trim() || !code.trim() || !value || !validFrom || !validTo) {
      toast.error("Please fill in name, code, value and validity dates.");
      return;
    }
    if (new Date(validTo) < new Date(validFrom)) {
      toast.error("Valid-to date must be after valid-from date.");
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      valueType,
      value: Number(value),
      minOrder: Number(minOrder) || 0,
      validFrom,
      validTo,
      used: 0,
      cap: cap ? Number(cap) : null,
      status: computeStatus(validFrom, validTo),
    });
    toast.success(`${name.trim()} created.`);
    reset();
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
        <Button size="sm" className="h-9 gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure the discount, its value and validity period.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="d-name">Name</Label>
              <Input
                id="d-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Festive Bonanza"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-code">Code</Label>
              <Input
                id="d-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="FESTIVE20"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Discount type</Label>
              <Select
                value={valueType}
                onValueChange={(v) => setValueType(v as DiscountValueType)}
                disabled={!!lockType}
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
              <Label htmlFor="d-value">
                {valueType === "percentage" ? "Value (%)" : "Value (₹)"}
              </Label>
              <Input
                id="d-value"
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
              <Label htmlFor="d-min">Min. order (₹)</Label>
              <Input
                id="d-min"
                type="number"
                min={0}
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="500"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-cap">Usage limit</Label>
              <Input
                id="d-cap"
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
              <Label htmlFor="d-from">Valid from</Label>
              <Input
                id="d-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-to">Valid to</Label>
              <Input
                id="d-to"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            Create discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
