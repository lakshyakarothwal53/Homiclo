import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import type { DiscountStatus } from "@/components/discounts/types";

export const Route = createFileRoute("/_app/discounts/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — HOMIQLO" },
      { name: "description", content: "Multi-channel promotional campaigns." },
    ],
  }),
  component: Page,
});

type Campaign = {
  name: string;
  blurb: string;
  validTill: string;
  used: string;
  status: DiscountStatus;
};

const campaigns: Campaign[] = [
  {
    name: "Diwali Bonanza",
    blurb: "Flat 20% off across all categories.",
    validTill: "15 Nov",
    used: "128",
    status: "Active",
  },
  {
    name: "Festive Combo",
    blurb: "Buy 2 get 1 free on selected apparel.",
    validTill: "20 Nov",
    used: "42",
    status: "Active",
  },
  {
    name: "Weekend Flash",
    blurb: "Flat ₹100 on weekend purchases.",
    validTill: "Recurring",
    used: "256",
    status: "Active",
  },
  {
    name: "Black Friday",
    blurb: "Up to 50% off store-wide.",
    validTill: "29 Nov",
    used: "—",
    status: "Upcoming",
  },
  {
    name: "New Year Special",
    blurb: "Mega discount on electronics.",
    validTill: "01 Jan",
    used: "—",
    status: "Upcoming",
  },
  {
    name: "Summer Clearance",
    blurb: "End of season sale.",
    validTill: "—",
    used: "612",
    status: "Ended",
  },
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Discounts › Campaigns"
        title="Promotional Campaigns"
        description="Campaigns overview and controls."
        actions={
          <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <Card
            key={c.name}
            className="border-border transition hover:border-brand/40 hover:shadow-sm"
          >
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div>
                <StatusBadge status={c.status} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>
                  Valid till: <span className="font-semibold text-foreground">{c.validTill}</span>
                </span>
                <span>
                  Used: <span className="font-semibold text-foreground">{c.used}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
