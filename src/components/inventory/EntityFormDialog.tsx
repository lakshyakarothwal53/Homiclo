import { type ReactNode, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EntityField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
};

export type EntityValues = Record<string, string | number>;

/**
 * Generic add/edit form dialog for the inventory list pages — the same UX as
 * CategoryDialog, but driven by a `fields` schema so Products / Stock Inward /
 * Stock Outward / Low Stock Alerts can share one component instead of four
 * near-identical dialogs. Controlled (pass `open`/`onOpenChange`) for the
 * FilterBar "Add New" button, or self-managed via a `trigger` for per-row Edit.
 */
export function EntityFormDialog({
  mode,
  title,
  description,
  fields,
  initial,
  trigger,
  open,
  onOpenChange,
  onSave,
}: {
  mode: "add" | "edit";
  title: string;
  description?: string;
  fields: readonly EntityField[];
  // `object` so plain interface rows (Product, etc.) are accepted without an
  // index signature; read positionally via the field keys below.
  initial?: object;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (values: EntityValues) => void;
}) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? open : internalOpen;

  const build = () => {
    const init = initial as Record<string, unknown> | undefined;
    return Object.fromEntries(
      fields.map((f) => [f.key, init?.[f.key] != null ? String(init[f.key]) : ""]),
    );
  };
  const [values, setValues] = useState<Record<string, string>>(build);

  // Re-sync fields each time the dialog opens (e.g. editing a different row).
  useEffect(() => {
    if (actualOpen) setValues(build());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualOpen]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  function submit() {
    for (const f of fields) {
      if (f.required && !(values[f.key] ?? "").trim()) {
        toast.error(`${f.label} is required.`);
        return;
      }
    }
    const out: EntityValues = {};
    for (const f of fields) {
      const raw = (values[f.key] ?? "").trim();
      out[f.key] = f.type === "number" ? Number(raw) || 0 : raw;
    }
    onSave(out);
    setOpen(false);
  }

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setValues(build());
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`ef-${f.key}`}>{f.label}</Label>
              {f.type === "select" ? (
                <Select
                  value={values[f.key] ?? ""}
                  onValueChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                >
                  <SelectTrigger id={`ef-${f.key}`}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`ef-${f.key}`}
                  type={f.type === "number" ? "number" : "text"}
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            {mode === "add" ? "Add" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
