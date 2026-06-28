import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsLayout,
});

function NotificationsLayout() {
  return <Outlet />;
}
