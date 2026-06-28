import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/billing/create-invoice")({
  head: () => ({
    meta: [
      { title: "Create Invoice — HOMIQLO" },
      { name: "description", content: "Generate a new GST-compliant invoice." },
    ],
  }),
  component: Page,
});

type LineItem = { id: number; product: string; qty: number; rate: number; tax: number };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

let nextId = 3;

function Page() {
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, product: "Cotton T-Shirt L", qty: 2, rate: 599, tax: 18 },
    { id: 2, product: "Wireless Earbuds", qty: 1, rate: 2499, tax: 18 },
  ]);

  const update = (id: number, patch: Partial<LineItem>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addItem = () =>
    setItems((rows) => [...rows, { id: nextId++, product: "", qty: 1, rate: 0, tax: 18 }]);

  const removeItem = (id: number) => setItems((rows) => rows.filter((r) => r.id !== id));

  const lineTotal = (i: LineItem) => i.qty * i.rate * (1 + i.tax / 100);
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const gst = items.reduce((s, i) => s + i.qty * i.rate * (i.tax / 100), 0);
  const total = subtotal + gst;

  return (
    <>
      <PageHeader
        eyebrow="Billing › Create Invoice"
        title="Create Invoice"
        description="Create Invoice overview and controls."
      />

      <Card className="border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer Name</Label>
              <Input id="customer" placeholder="Anita Desai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">Phone / GSTIN</Label>
              <Input id="gstin" placeholder="+91 ..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-date">Invoice Date</Label>
              <Input id="inv-date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Due Date</Label>
              <Input id="due-date" type="date" />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 text-left font-medium">Product</th>
                    <th className="px-3 py-2 text-left font-medium">Qty</th>
                    <th className="px-3 py-2 text-left font-medium">Rate</th>
                    <th className="px-3 py-2 text-left font-medium">Tax</th>
                    <th className="px-3 py-2 text-left font-medium">Total</th>
                    <th className="w-10 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-3">
                        <Input
                          value={i.product}
                          onChange={(e) => update(i.id, { product: e.target.value })}
                          placeholder="Product name"
                          className="max-w-[280px]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min={1}
                          value={i.qty}
                          onChange={(e) => update(i.id, { qty: Number(e.target.value) })}
                          className="w-20"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min={0}
                          value={i.rate}
                          onChange={(e) => update(i.id, { rate: Number(e.target.value) })}
                          className="w-28"
                        />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{i.tax}%</td>
                      <td className="px-3 py-3 font-medium">{inr(lineTotal(i))}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => removeItem(i.id)}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-brand"
                          aria-label="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{inr(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST 18%</span>
                <span className="font-medium text-foreground">{inr(gst)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => toast.success("Draft saved")}>
              Save Draft
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => toast.success(`Invoice generated · ${inr(total)}`)}
            >
              Generate Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
