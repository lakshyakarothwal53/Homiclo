import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/billing")({
  component: BillingLayout,
});

function BillingLayout() {
  return <Outlet />;
}
