import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts, useSubmitStockAdjustment } from "@/hooks/use-inventory";

export const Route = createFileRoute("/_app/inventory/stock-adjustment")({
  head: () => ({
    meta: [
      { title: "Stock Adjustment — HOMIQLO" },
      { name: "description", content: "Correct stock counts after audits." },
    ],
  }),
  component: Page,
});

const REASONS = ["Damage", "Audit Correction", "Theft", "Return", "Other"] as const;

const schema = z.object({
  sku: z.string().min(1, "Select a product"),
  adjustedStock: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Cannot be negative"),
  reason: z.enum(REASONS, { required_error: "Select a reason" }),
  date: z.string().min(1, "Pick a date"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function Page() {
  const { data: products = [] } = useProducts();
  const submit = useSubmitStockAdjustment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sku: "", adjustedStock: 0, date: "", notes: "" },
  });

  const selectedSku = form.watch("sku");
  const currentStock = products.find((p) => p.sku === selectedSku)?.stock;

  function onSubmit(values: FormValues) {
    submit.mutate(values, {
      onSuccess: () => {
        const product = products.find((p) => p.sku === values.sku);
        toast.success(`Stock adjusted for ${product?.name ?? values.sku}`);
        form.reset();
      },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Adjustment"
        description="Adjustments overview and controls."
      />

      <Card className="border-border">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.sku} value={p.sku}>
                            {p.name} · {p.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input
                    value={currentStock ?? ""}
                    readOnly
                    placeholder="—"
                    className="bg-secondary"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adjustedStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adjusted Stock</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Add context for this adjustment…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submit.isPending}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {submit.isPending ? "Submitting…" : "Submit Adjustment"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
