import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/settings/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — HOMIQLO" },
      { name: "description", content: "Configure user roles." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="Roles & Permissions"
      description="Configure user roles."
    />
  );
}
