import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CampaignDialog } from "@/components/discounts/CampaignDialog";
import { StatusBadge } from "@/components/discounts/StatusBadge";
import {
  useDiscountCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
} from "@/hooks/use-discounts";
import type { DiscountCampaignInput } from "@/types/discounts";

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
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  function handleCreate(values: DiscountCampaignInput) {
    createCampaign.mutate(values, {
      onSuccess: () => toast.success(`${values.name} created.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create campaign."),
    });
  }

  function handleUpdate(originalName: string, values: DiscountCampaignInput) {
    updateCampaign.mutate(
      { ...values, originalName },
      {
        onSuccess: () => toast.success(`${values.name} updated.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update campaign."),
      },
    );
  }

  function handleDelete(name: string) {
    deleteCampaign.mutate(name, {
      onSuccess: () => toast.success(`${name} deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete campaign."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Discounts › Campaigns"
        title="Promotional Campaigns"
        description="Campaigns overview and controls."
        actions={<CampaignDialog mode="add" onSave={handleCreate} />}
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
              <div className="flex items-center gap-4 border-t border-border pt-3">
                <CampaignDialog
                  mode="edit"
                  initial={c}
                  onSave={(values) => handleUpdate(c.name, values)}
                  trigger={
                    <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-sm font-medium text-muted-foreground hover:text-destructive hover:underline">
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{c.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the campaign. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => handleDelete(c.name)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
