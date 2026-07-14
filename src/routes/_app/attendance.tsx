import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — HOMIQLO" },
      { name: "description", content: "Attendance management system." },
    ],
  }),
  component: Layout,
});

function Layout() {
  return <Outlet />;
}
