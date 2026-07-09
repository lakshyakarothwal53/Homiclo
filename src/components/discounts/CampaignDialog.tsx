import { type ReactNode, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { DiscountStatus } from "./types";
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

  function reset() {
    setName(initial?.name ?? "");
    setBlurb(initial?.blurb ?? "");
    setValidTill(initial?.validTill ?? "");
    setUsed(initial?.used ?? "—");
    setStatus(initial?.status ?? "Active");
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
    onSave({
      name: name.trim(),
      blurb: blurb.trim(),
      validTill: validTill.trim() || "—",
      used: used.trim() || "—",
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
