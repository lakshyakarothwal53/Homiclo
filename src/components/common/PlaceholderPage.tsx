import { PageHeader } from "./PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, Plus, Download } from "lucide-react";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description ?? "This module is part of the HOMIQLO Super Admin suite."}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="h-4 w-4" /> New
            </Button>
          </>
        }
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-foreground">
            <Construction className="h-5 w-5" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Layout, dummy data, and detailed views for this section will be added next. The
              route, navigation, and shell are fully wired.
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm">Documentation</Button>
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}