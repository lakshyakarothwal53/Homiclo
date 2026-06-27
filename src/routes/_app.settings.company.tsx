import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/settings/company")({
  head: () => ({
    meta: [
      { title: "Company — HOMIQLO" },
      { name: "description", content: "Company info, branches and branding." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="Company"
      description="Company info, branches and branding."
    />
  );
}
