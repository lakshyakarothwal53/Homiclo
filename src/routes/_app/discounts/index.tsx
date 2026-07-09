import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Tag, IndianRupee, CheckCircle2, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddDiscountDialog } from "@/components/discounts/AddDiscountDialog";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import type { PromoRow } from "@/components/discounts/types";
import {
  useDiscountsDashboard,
  useDiscountsActive,
  useCreateDiscountPromo,
} from "@/hooks/use-discounts";
import type { DiscountsActiveRow } from "@/types/discounts";

export const Route = createFileRoute("/_app/discounts/")({
  head: () => ({
    meta: [
      { title: "Discount Dashboard — HOMIQLO" },
      { name: "description", content: "Active promotions and performance." },
    ],
  }),
  component: Page,
});

const TYPE_DOT: Record<DiscountsActiveRow["type"], string> = {
  Percentage: "bg-[color:var(--info)]",
  Flat: "bg-brand",
  Category: "bg-[color:var(--warning)]",
};

function Page() {
  const { data: dashboard } = useDiscountsDashboard();
  const { data: activeDiscounts = [] } = useDiscountsActive();
  const createPromo = useCreateDiscountPromo();

  function handleCreate(row: PromoRow) {
    // A dashboard "New Discount" lands in the promo bucket matching its value type.
    createPromo.mutate(
      { ...row, discountType: row.valueType },
      {
        onSuccess: () => toast.success(`${row.name} created.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create discount."),
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Discounts › Dashboard"
        title="Discount Dashboard"
        description="Dashboard overview and controls."
        actions={
          <AddDiscountDialog
            mode="add"
            triggerLabel="New Discount"
            title="New Discount"
            onSubmit={handleCreate}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Campaigns"
          value={dashboard?.activeCampaigns ?? "—"}
          hint={dashboard?.activeCampaignsHint}
          icon={Tag}
        />
        <StatCard
          label="Discount Given"
          value={dashboard?.discountGiven ?? "—"}
          hint={dashboard?.discountGivenHint}
          icon={IndianRupee}
        />
        <StatCard
          label="Times Used"
          value={dashboard?.timesUsed ?? "—"}
          hint={dashboard?.timesUsedHint}
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg. Discount"
          value={dashboard?.avgDiscount ?? "—"}
          hint={dashboard?.avgDiscountHint}
          icon={BarChart3}
        />
      </div>

      <Card className="mt-6 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active Discounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Value</th>
                  <th className="px-5 py-3 text-left font-medium">Applies To</th>
                  <th className="px-5 py-3 text-left font-medium">Valid Till</th>
                  <th className="px-5 py-3 text-left font-medium">Used</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeDiscounts.map((r) => (
                  <tr key={r.name} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                        <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[r.type]}`} />
                        {r.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">{r.value}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.appliesTo}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.validTill}</td>
                    <td className="px-5 py-3.5">{r.used}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
