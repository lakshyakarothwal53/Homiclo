import { createFileRoute } from "@tanstack/react-router";
import { Tag, IndianRupee, CheckCircle2, BarChart3, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import type { DiscountStatus } from "@/components/discounts/types";

export const Route = createFileRoute("/_app/discounts/")({
  head: () => ({
    meta: [
      { title: "Discount Dashboard — HOMIQLO" },
      { name: "description", content: "Active promotions and performance." },
    ],
  }),
  component: Page,
});

type ActiveRow = {
  name: string;
  type: "Percentage" | "Flat" | "Category";
  value: string;
  appliesTo: string;
  validTill: string;
  used: string;
  status: DiscountStatus;
};

const TYPE_DOT: Record<ActiveRow["type"], string> = {
  Percentage: "bg-[color:var(--info)]",
  Flat: "bg-brand",
  Category: "bg-[color:var(--warning)]",
};

const activeDiscounts: ActiveRow[] = [
  {
    name: "Diwali Bonanza",
    type: "Percentage",
    value: "20%",
    appliesTo: "All Products",
    validTill: "15 Nov 2024",
    used: "128 / 500",
    status: "Active",
  },
  {
    name: "Festive Flat ₹100",
    type: "Flat",
    value: "₹100",
    appliesTo: "Orders > ₹500",
    validTill: "20 Nov 2024",
    used: "62 / 200",
    status: "Active",
  },
  {
    name: "Apparel Sale",
    type: "Category",
    value: "15%",
    appliesTo: "Apparel",
    validTill: "30 Nov 2024",
    used: "38 / 300",
    status: "Active",
  },
  {
    name: "New Customer ₹50 Off",
    type: "Flat",
    value: "₹50",
    appliesTo: "First Order",
    validTill: "31 Dec 2024",
    used: "20 / —",
    status: "Active",
  },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Discounts › Dashboard"
        title="Discount Dashboard"
        description="Dashboard overview and controls."
        actions={
          <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="h-4 w-4" /> New Discount
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Campaigns" value="4" hint="12 discounts live" icon={Tag} />
        <StatCard label="Discount Given" value="₹48,200" hint="This month" icon={IndianRupee} />
        <StatCard label="Times Used" value="248" hint="Across all promos" icon={CheckCircle2} />
        <StatCard label="Avg. Discount" value="18%" hint="Per transaction" icon={BarChart3} />
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
