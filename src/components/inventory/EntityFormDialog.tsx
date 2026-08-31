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

/**
 * A select option. A plain string is used as both the stored value and the
 * label; the object form separates them, for fields whose stored value is an
 * id but which must display a human name (e.g. a shift).
 */
export type EntityOption = string | { value: string; label: string };

export type EntityField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "password";
  options?: readonly EntityOption[];
  required?: boolean;
  placeholder?: string;
};

const optionValue = (o: EntityOption) => (typeof o === "string" ? o : o.value);
const optionLabel = (o: EntityOption) => (typeof o === "string" ? o : o.label);

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
      // Passwords are taken verbatim — trimming would silently alter the secret.
      const raw = f.type === "password" ? (values[f.key] ?? "") : (values[f.key] ?? "").trim();
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
      <DialogContent className="max-w-full sm:max-w-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          {description ? <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2 max-h-[calc(90vh-140px)] overflow-y-auto pr-2">
          {fields.map((f) => (
            <div key={f.key} className="grid gap-2">
              <Label htmlFor={`ef-${f.key}`} className="text-xs sm:text-sm font-medium">{f.label}</Label>
              {f.type === "select" ? (
                <Select
                  value={values[f.key] ?? ""}
                  onValueChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                >
                  <SelectTrigger id={`ef-${f.key}`} className="h-9 sm:h-8 text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={optionValue(o)} value={optionValue(o)} className="text-sm">
                        {optionLabel(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`ef-${f.key}`}
                  type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
                  autoComplete={f.type === "password" ? "new-password" : undefined}
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="h-9 sm:h-8 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto h-9 sm:h-8">
            Cancel
          </Button>
          <Button className="w-full sm:w-auto h-9 sm:h-8 bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            {mode === "add" ? "Add" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
