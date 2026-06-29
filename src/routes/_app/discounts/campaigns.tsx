import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import { useDiscountCampaigns } from "@/hooks/use-discounts";

export const Route = createFileRoute("/_app/discounts/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — HOMIQLO" },
      { name: "description", content: "Multi-channel promotional campaigns." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: campaigns = [] } = useDiscountCampaigns();

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
