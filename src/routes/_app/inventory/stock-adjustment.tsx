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
import { useBranchScope } from "@/hooks/use-branch-scope";
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
  changeAmount: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Must be a whole number"),
  reason: z.enum(REASONS, { required_error: "Select a reason" }),
  date: z.string().min(1, "Pick a date"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function Page() {
  const { homeBranch } = useBranchScope();
  const { data: products = [] } = useProducts(undefined, homeBranch);
  const submit = useSubmitStockAdjustment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sku: "", changeAmount: 0, date: "", notes: "" },
  });

  const selectedSku = form.watch("sku");
  const currentStock = products.find((p) => p.sku === selectedSku)?.stock;

  function onSubmit(values: FormValues) {
    const newStock = (currentStock ?? 0) + values.changeAmount;
    if (newStock < 0) {
      toast.error("Adjustment would result in negative stock");
      return;
    }
    submit.mutate(
      { ...values, adjustedStock: newStock, branch: homeBranch },
      {
        onSuccess: () => {
          const product = products.find((p) => p.sku === values.sku);
          const operation = values.changeAmount > 0 ? "added" : "removed";
          const amount = Math.abs(values.changeAmount);
          toast.success(
            `${amount} unit${amount !== 1 ? "s" : ""} ${operation} for ${product?.name ?? values.sku}`,
          );
          form.reset();
        },
        onError: (error) => {
          console.error("Stock adjustment failed:", error);
          toast.error(`Failed to adjust stock: ${error.message}`);
        },
      },
    );
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
                  name="changeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Change</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., +5 to add, -3 to remove"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        New stock will be: {currentStock ?? 0} + {field.value || 0} = {(currentStock ?? 0) + (field.value ? parseInt(field.value) : 0)}
                      </p>
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
