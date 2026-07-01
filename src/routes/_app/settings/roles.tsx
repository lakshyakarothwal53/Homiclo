import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { useRoles, useSettingsBranches } from "@/hooks/use-settings";

export const Route = createFileRoute("/_app/settings/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — HOMIQLO" },
      { name: "description", content: "Roles overview and controls." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "role", label: "Role" },
  { key: "users", label: "Users" },
  { key: "description", label: "Description" },
  { key: "permissions", label: "Permissions" },
  { key: "action", label: "", align: "right" },
];

function Page() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const { data: rows = [] } = useRoles(search, branch);
  const { data: branches = [] } = useSettingsBranches();

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
        branches={branches}
        branch={branch}
        onBranchChange={setBranch}
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
