import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateBillingInvoice,
  useCreateBillingPayment,
  useCreateTaxInvoice,
  useNextInvoiceNumber,
  useNextReceiptNumber,
} from "@/hooks/use-billing";
import { useCustomerSearch, useUpsertCustomer } from "@/hooks/use-customers";
import type { Customer } from "@/types/customer";

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

const displayDate = (d: Date) => `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;

let nextId = 3;

function Page() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [dob, setDob] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedName, setDebouncedName] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, product: "Cotton T-Shirt L", qty: 2, rate: 599, tax: 18 },
    { id: 2, product: "Wireless Earbuds", qty: 1, rate: 2499, tax: 18 },
  ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(customer), 300);
    return () => clearTimeout(t);
  }, [customer]);

  const { data: suggestions = [] } = useCustomerSearch(debouncedName);
  const { data: nextInvoice } = useNextInvoiceNumber();
  const { data: nextReceipt } = useNextReceiptNumber();
  const upsertCustomer = useUpsertCustomer();
  const createInvoice = useCreateBillingInvoice();
  const createPayment = useCreateBillingPayment();
  const createTaxInvoice = useCreateTaxInvoice();

  function selectCustomer(c: Customer) {
    setCustomer(c.name);
    setMobile(c.mobile);
    setGstNumber(c.gst ?? "");
    setDob(c.dob ?? "");
    setShowSuggestions(false);
  }

  const update = (id: number, patch: Partial<LineItem>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addItem = () =>
    setItems((rows) => [...rows, { id: nextId++, product: "", qty: 1, rate: 0, tax: 18 }]);

  const removeItem = (id: number) => setItems((rows) => rows.filter((r) => r.id !== id));

  const lineTotal = (i: LineItem) => i.qty * i.rate * (1 + i.tax / 100);
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const gstAmount = items.reduce((s, i) => s + i.qty * i.rate * (i.tax / 100), 0);
  const total = subtotal + gstAmount;

  async function handleGenerate() {
    if (!customer.trim()) {
      toast.error("Enter a customer name.");
      return;
    }
    if (!mobile.trim()) {
      toast.error("Enter a mobile number.");
      return;
    }
    if (items.length === 0 || total <= 0) {
      toast.error("Add at least one item.");
      return;
    }
    if (!nextInvoice || !nextReceipt) {
      toast.error("Still loading invoice numbers, try again.");
      return;
    }

    const now = new Date();
    const isoDate = now.toISOString().slice(0, 10);
    const dateLabel = displayDate(now);
    const amount = inr(total);
    const gstin = gstNumber.trim();

    try {
      await upsertCustomer.mutateAsync({
        mobile: mobile.trim(),
        name: customer,
        gst: gstin || null,
        dob: dob || null,
      });

      await createInvoice.mutateAsync({
        invoice: nextInvoice,
        date: dateLabel,
        customer,
        amount,
        payment: paymentMode,
        status: "Paid",
        bill_date: isoDate,
        amount_num: total,
      });

      await createPayment.mutateAsync({
        receipt: nextReceipt,
        date: dateLabel,
        customer,
        invoice: nextInvoice,
        amount,
        mode: paymentMode,
        status: "Received",
        pay_date: isoDate,
        amount_num: total,
      });

      // Only invoices where the customer supplied a GST number appear on
      // the Tax Invoices page.
      if (gstin) {
        await createTaxInvoice.mutateAsync({
          invoice: nextInvoice,
          date: dateLabel,
          gstin,
          taxable: inr(subtotal),
          cgst: inr(gstAmount / 2),
          sgst: inr(gstAmount / 2),
          total: amount,
        });
      }

      toast.success(`Invoice ${nextInvoice} generated · ${amount}`);
      router.navigate({ to: "/billing/payments" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate invoice.");
    }
  }

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
            <div className="relative space-y-1.5">
              <Label htmlFor="customer">Customer Name</Label>
              <Input
                id="customer"
                placeholder="Anita Desai"
                value={customer}
                autoComplete="off"
                onChange={(e) => {
                  setCustomer(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-md">
                  {suggestions.map((c) => (
                    <button
                      key={c.mobile}
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-secondary"
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.mobile}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GST Number</Label>
              <Input
                id="gstin"
                placeholder="27ABCDE1234F1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-date">Invoice Date</Label>
              <Input id="inv-date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Due Date</Label>
              <Input id="due-date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-mode">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger id="payment-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                </SelectContent>
              </Select>
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
                <span className="font-medium text-foreground">{inr(gstAmount)}</span>
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
              disabled={
                createInvoice.isPending ||
                createPayment.isPending ||
                upsertCustomer.isPending ||
                createTaxInvoice.isPending
              }
              onClick={handleGenerate}
            >
              Generate Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
