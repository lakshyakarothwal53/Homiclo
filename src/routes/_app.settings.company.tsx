import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/settings/company")({
  head: () => ({
    meta: [
      { title: "Company Settings — HOMIQLO" },
      { name: "description", content: "Company overview and controls." },
    ],
  }),
  component: Page,
});

const CURRENCIES = [
  { value: "INR", label: "INR ₹" },
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
  { value: "GBP", label: "GBP £" },
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
];

function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Settings › Company"
        title="Company Settings"
        description="Company overview and controls."
      />

      <Card className="border-border p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Company settings saved");
          }}
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" defaultValue="Nexus Retail Pvt Ltd" />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" defaultValue="27ABCDE1234F1Z5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" defaultValue="ABCDE1234F" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="hello@nexusretail.in" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue="+91 22 4000 1234" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Registered Address</Label>
              <Textarea
                id="address"
                rows={3}
                defaultValue="Plot 12, Andheri MIDC, Mumbai 400093"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select defaultValue="INR">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue="Asia/Kolkata">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
