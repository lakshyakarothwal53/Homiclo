import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/settings/preferences")({
  head: () => ({
    meta: [
      { title: "System Preferences — HOMIQLO" },
      { name: "description", content: "Locale, theme and defaults." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="System Preferences"
      description="Locale, theme and defaults."
    />
  );
}
