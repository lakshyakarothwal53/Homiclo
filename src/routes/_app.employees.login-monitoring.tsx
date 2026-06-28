import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const Route = createFileRoute("/_app/employees/login-monitoring")({
  head: () => ({
    meta: [
      { title: "Login Monitoring — HOMIQLO" },
      { name: "description", content: "Active sessions and login history." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PlaceholderPage
      eyebrow="Employees"
      title="Login Monitoring"
      description="Active sessions and login history."
    />
  );
}
