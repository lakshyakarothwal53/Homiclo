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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import {
  useBranchList,
  useCreateBranch,
  useDeleteBranch,
  useUpdateBranch,
} from "@/hooks/use-settings";
import { downloadCsv } from "@/lib/pdf-utils";
import type { BranchInfo } from "@/types/settings";

export const Route = createFileRoute("/_app/settings/branches")({
  head: () => ({
    meta: [
      { title: "Branches — HOMIQLO" },
      { name: "description", content: "Create and manage branches." },
    ],
  }),
  component: Page,
});

const COLUMNS: Column[] = [
  { key: "name", label: "Branch" },
  { key: "address", label: "Address" },
  { key: "coords", label: "Geofence (lat, long, radius)" },
  { key: "admin", label: "Branch Admin" },
  { key: "action", label: "", align: "right" },
];

const SHARED_FIELDS: EntityField[] = [
  { key: "address", label: "Address", required: true, placeholder: "Andheri, Mumbai" },
  { key: "latitude", label: "Latitude", type: "number", placeholder: "19.0760" },
  { key: "longitude", label: "Longitude", type: "number", placeholder: "72.8777" },
  { key: "radiusMeters", label: "Geofence Radius (m)", type: "number", placeholder: "50" },
  { key: "adminName", label: "Admin Name (optional)", placeholder: "Full name" },
  { key: "adminEmail", label: "Admin Email (optional)", placeholder: "admin@homiqlo.co" },
  {
    key: "adminPassword",
    label: "Admin Password (optional)",
    placeholder: "Creates a Branch Admin login",
  },
];

const ADD_FIELDS: EntityField[] = [
  { key: "name", label: "Branch Name", required: true, placeholder: "Pune Store" },
  ...SHARED_FIELDS,
];

function toBranchInput(name: string, v: EntityValues) {
  return {
    name,
    latitude: Number(v.latitude) || null,
    longitude: Number(v.longitude) || null,
    radiusMeters: Number(v.radiusMeters) || 50,
    address: String(v.address),
    adminName: String(v.adminName ?? "").trim() || undefined,
    adminEmail: String(v.adminEmail ?? "").trim() || undefined,
    adminPassword: String(v.adminPassword ?? "").trim() || undefined,
  };
}

function Page() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { data: rows = [], isLoading } = useBranchList();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const filtered = search
    ? rows.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          (b.address ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : rows;
  const { page, setPage, totalPages, pageItems } = usePagination(filtered);

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Nothing to export.");
      return;
    }
    downloadCsv(
      "branches.csv",
      ["Branch", "Address", "Latitude", "Longitude", "Radius (m)", "Admin", "Admin Email"],
      filtered.map((b) => [
        b.name,
        b.address ?? "",
        b.latitude ?? "",
        b.longitude ?? "",
        b.radiusMeters,
        b.adminName ?? "",
        b.adminEmail ?? "",
      ]),
    );
    toast.success(`Exported ${filtered.length} branches.`);
  }

  function handleAdd(v: EntityValues) {
    const name = String(v.name).trim();
    if (rows.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`Branch "${name}" already exists.`);
      return;
    }
    const input = toBranchInput(name, v);
    if (input.adminPassword && (!input.adminName || !input.adminEmail)) {
      toast.error("Admin name and email are required to create an admin login.");
      return;
    }
    createBranch.mutate(input, {
      onSuccess: () =>
        toast.success(
          input.adminPassword
            ? `Branch "${name}" created with admin login ${input.adminEmail}.`
            : `Branch "${name}" created.`,
        ),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create branch."),
    });
  }

  function handleUpdate(original: BranchInfo, v: EntityValues) {
    const input = toBranchInput(original.name, v);
    if (input.adminPassword && (!input.adminName || !input.adminEmail)) {
      toast.error("Admin name and email are required to create an admin login.");
      return;
    }
    updateBranch.mutate(input, {
      onSuccess: () => toast.success(`Branch "${original.name}" updated.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update branch."),
    });
  }

  function handleDelete(name: string) {
    deleteBranch.mutate(name, {
      onSuccess: () => toast.success(`Branch "${name}" deleted.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete branch."),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings › Branches"
        title="Branches"
        description="Create and manage branches, their geofences and branch admins."
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search branches…"
        primaryLabel="Add Branch"
        onPrimary={() => setAddOpen(true)}
        onExport={handleExport}
      />

      <EntityFormDialog
        mode="add"
        title="Add Branch"
        description="New branches appear in every branch dropdown and the attendance geofence list. Fill the admin fields to create that branch's admin login in one step."
        fields={ADD_FIELDS}
        initial={{ radiusMeters: 50 }}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
      />

      <DataTableCard
        columns={COLUMNS}
        count={filtered.length}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={COLUMNS.length} className="px-5 py-6 text-muted-foreground">
              Loading branches…
            </TableCell>
          </TableRow>
        ) : (
          pageItems.map((b) => (
            <TableRow key={b.name} className="border-t border-border">
              <TableCell className="px-5 py-3 font-medium">{b.name}</TableCell>
              <TableCell className="px-5 py-3 text-muted-foreground">{b.address ?? "—"}</TableCell>
              <TableCell className="px-5 py-3 text-muted-foreground">
                {b.latitude != null && b.longitude != null
                  ? `${b.latitude}, ${b.longitude} · ${b.radiusMeters}m`
                  : "—"}
              </TableCell>
              <TableCell className="px-5 py-3 text-muted-foreground">
                {b.adminName ? `${b.adminName} (${b.adminEmail})` : "—"}
              </TableCell>
              <TableCell className="px-5 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  <EntityFormDialog
                    mode="edit"
                    title={`Edit ${b.name}`}
                    description="The branch name cannot be changed — other records reference it."
                    fields={SHARED_FIELDS}
                    initial={b}
                    trigger={
                      <button className="text-sm font-medium text-brand hover:underline">
                        Edit
                      </button>
                    }
                    onSave={(v) => handleUpdate(b, v)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-sm font-medium text-muted-foreground hover:underline">
                        Delete
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the branch, its geofence office, its admin assignment and all
                          of its per-branch data rows (inventory, billing, discounts, reports).
                          Employee accounts in this branch are kept but can no longer check in. This
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-brand text-brand-foreground hover:bg-brand/90"
                          onClick={() => handleDelete(b.name)}
                        >
                          Delete branch
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTableCard>
    </>
  );
}
