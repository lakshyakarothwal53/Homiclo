import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/employees")({
  head: () => ({
    meta: [
      { title: "Employees — HOMIQLO" },
      { name: "description", content: "All employees across HOMIQLO branches." },
    ],
  }),
  component: EmployeesLayout,
});

function EmployeesLayout() {
  return <Outlet />;
}
