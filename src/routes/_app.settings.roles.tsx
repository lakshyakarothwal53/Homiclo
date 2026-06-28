import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/settings/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — HOMIQLO" },
      { name: "description", content: "Roles overview and controls." },
    ],
  }),
  component: Page,
});

type Role = {
  role: string;
  users: number;
  description: string;
  permissions: string;
};

const ROLES: Role[] = [
  { role: "Super Admin", users: 1, description: "Full system access", permissions: "All" },
  { role: "Manager", users: 4, description: "Branch & operations", permissions: "32 permissions" },
  { role: "Cashier", users: 12, description: "POS access only", permissions: "8 permissions" },
  { role: "Inventory Staff", users: 6, description: "Stock management", permissions: "14 permissions" },
  { role: "Sales Executive", users: 18, description: "Sales & customers", permissions: "12 permissions" },
];

const COLUMNS: Column[] = [
  { key: "role", label: "Role" },
  { key: "users", label: "Users" },
  { key: "description", label: "Description" },
  { key: "permissions", label: "Permissions" },
  { key: "action", label: "", align: "right" },
];

function Page() {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ROLES;
    return ROLES.filter(
      (r) => r.role.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <>
      <PageHeader
        eyebrow="Settings › Roles"
        title="Roles & Permissions"
        description="Roles overview and controls."
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search roles…"
        primaryLabel="Add New"
        onPrimary={() => toast.info("Add role — coming soon")}
        onExport={() => toast.success("Exporting roles…")}
      />

      <DataTableCard columns={COLUMNS} count={rows.length}>
        {rows.map((r) => (
          <TableRow key={r.role} className="border-t border-border">
            <TableCell className="px-5 py-3 font-medium">{r.role}</TableCell>
            <TableCell className="px-5 py-3">{r.users}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.description}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.permissions}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              <button
                className="text-sm font-medium text-brand hover:underline"
                onClick={() => toast.info(`Edit ${r.role}`)}
              >
                Edit
              </button>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
