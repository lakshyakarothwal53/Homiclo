import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTableCard, type Column } from "@/components/inventory/DataTableCard";
import {
  EntityFormDialog,
  type EntityField,
  type EntityValues,
} from "@/components/inventory/EntityFormDialog";
import { FilterBar } from "@/components/inventory/FilterBar";
import { TableCell, TableRow } from "@/components/ui/table";
import { useBranchScope } from "@/hooks/use-branch-scope";
import { usePagination } from "@/hooks/use-pagination";
import { useCreateRole, useRoles, useSettingsBranches, useUpdateRole } from "@/hooks/use-settings";
import { downloadCsv } from "@/lib/pdf-utils";
import type { Role } from "@/types/settings";

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

const ROLE_FIELDS: EntityField[] = [
  { key: "role", label: "Role Name", required: true, placeholder: "Store Manager" },
  { key: "users", label: "Users", type: "number" },
  { key: "description", label: "Description", required: true, placeholder: "Manages one store" },
  {
    key: "permissions",
    label: "Permissions",
    required: true,
    placeholder: "Inventory, POS, Billing",
  },
];

const RLS_HINT = " — run supabase/13_completion_pack.sql to enable role writes.";

function Page() {
  const { scoped, homeBranch } = useBranchScope();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(homeBranch);
  const [addOpen, setAddOpen] = useState(false);
  const { data: rows = [] } = useRoles(search, branch);
  const { data: branches = [] } = useSettingsBranches();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const { page, setPage, totalPages, pageItems } = usePagination(rows);

  function handleExport() {
    if (rows.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "roles.csv",
      ["Role", "Users", "Description", "Permissions"],
      rows.map((r) => [r.role, r.users, r.description, r.permissions]),
    );
    toast.success(`Exported ${rows.length} roles.`);
  }

  function handleAdd(v: EntityValues) {
    createRole.mutate(
      {
        role: String(v.role),
        users: Number(v.users) || 0,
        description: String(v.description),
        permissions: String(v.permissions),
      },
      {
        onSuccess: () => toast.success(`Role "${v.role}" added.`),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message + RLS_HINT : "Could not add role."),
      },
    );
  }

  function handleUpdate(original: Role, v: EntityValues) {
    updateRole.mutate(
      {
        role: String(v.role),
        users: Number(v.users) || 0,
        description: String(v.description),
        permissions: String(v.permissions),
        originalRole: original.role,
      },
      {
        onSuccess: () => toast.success(`Role "${v.role}" updated.`),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message + RLS_HINT : "Could not update role."),
      },
    );
  }

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
        onPrimary={() => setAddOpen(true)}
        onExport={handleExport}
        {...(scoped ? {} : { branches, branch, onBranchChange: setBranch })}
      />

      <EntityFormDialog
        mode="add"
        title="Add Role"
        description="Create a new role with its permissions."
        fields={ROLE_FIELDS}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
      />

      <DataTableCard
        columns={COLUMNS}
        count={rows.length}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {pageItems.map((r) => (
          <TableRow key={r.role} className="border-t border-border">
            <TableCell className="px-5 py-3 font-medium">{r.role}</TableCell>
            <TableCell className="px-5 py-3">{r.users}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.description}</TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">{r.permissions}</TableCell>
            <TableCell className="px-5 py-3 text-right">
              <EntityFormDialog
                mode="edit"
                title={`Edit ${r.role}`}
                fields={ROLE_FIELDS}
                initial={r}
                trigger={
                  <button className="text-sm font-medium text-brand hover:underline">Edit</button>
                }
                onSave={(v) => handleUpdate(r, v)}
              />
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>
    </>
  );
}
