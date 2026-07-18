import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Settings as SettingsIcon, Plus, Save, RefreshCw, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  useShiftConfigs,
  useAttendanceSettings,
  useCreateShiftConfig,
  useUpdateShiftConfig,
  useDeleteShiftConfig,
  useUpdateAttendanceSetting,
} from "@/hooks/use-attendance";

export const Route = createFileRoute("/_app/attendance/settings")({
  head: () => ({
    meta: [
      { title: "Attendance Settings — HOMIQLO" },
      {
        name: "description",
        content: "Shifts, geo-fence radius and verification rules.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useShiftConfigs();
  const {
    data: settings = [],
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useAttendanceSettings();
  const createShiftMutation = useCreateShiftConfig();
  const updateShiftMutation = useUpdateShiftConfig();
  const deleteShiftMutation = useDeleteShiftConfig();
  const updateSettingMutation = useUpdateAttendanceSetting();

  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const emptyNewShift = {
    shiftName: "",
    startTime: "",
    endTime: "",
    gracePeriodMinutes: "15",
    geofenceRadius: "100",
  };
  const [newShift, setNewShift] = useState(emptyNewShift);

  const handleCreateShift = async () => {
    if (!newShift.shiftName.trim() || !newShift.startTime || !newShift.endTime) {
      toast.error("Please fill in the shift name, start time and end time");
      return;
    }
    try {
      await createShiftMutation.mutateAsync({
        shiftName: newShift.shiftName,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        gracePeriodMinutes: parseInt(newShift.gracePeriodMinutes) || 0,
        geofenceRadius: parseInt(newShift.geofenceRadius) || 0,
        requiresGPS: true,
        requiresPhoto: true,
        applicableDays: "Monday - Friday",
      });
      toast.success("Shift added successfully");
      setNewShift(emptyNewShift);
      setAddShiftOpen(false);
      await refetchShifts();
    } catch (error) {
      toast.error("Failed to add shift");
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteShiftMutation.mutateAsync(id);
      toast.success("Shift deleted successfully");
      await refetchShifts();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete shift";
      console.error("Delete shift error:", error);
      toast.error(msg);
    }
  };

  const handleEditShift = (id: string) => {
    if (editingShift === id) {
      setEditingShift(null);
    } else {
      const shift = shifts.find((s) => s.id === id);
      if (shift) {
        setEditValues({
          [`shift-${id}-start`]: shift.startTime,
          [`shift-${id}-end`]: shift.endTime,
          [`shift-${id}-grace`]: shift.gracePeriodMinutes.toString(),
        });
        setEditingShift(id);
      }
    }
  };

  const handleSaveShift = async (id: string) => {
    const shift = shifts.find((s) => s.id === id);
    if (!shift) return;

    try {
      await updateShiftMutation.mutateAsync({
        ...shift,
        startTime: editValues[`shift-${id}-start`] || shift.startTime,
        endTime: editValues[`shift-${id}-end`] || shift.endTime,
        gracePeriodMinutes: parseInt(
          editValues[`shift-${id}-grace`] || shift.gracePeriodMinutes.toString(),
        ),
      });
      setEditingShift(null);
      toast.success("Shift updated successfully");
      await refetchShifts();
    } catch (error) {
      toast.error("Failed to update shift");
    }
  };

  const handleEditSetting = (id: string) => {
    if (editingSetting === id) {
      setEditingSetting(null);
    } else {
      const setting = settings.find((s) => s.id === id);
      if (setting) {
        setEditValues({ [`setting-${id}`]: setting.value });
        setEditingSetting(id);
      }
    }
  };

  const handleSaveSetting = async (id: string) => {
    const setting = settings.find((s) => s.id === id);
    if (!setting) return;

    try {
      await updateSettingMutation.mutateAsync({
        ...setting,
        value: editValues[`setting-${id}`] || setting.value,
      });
      setEditingSetting(null);
      toast.success("Setting updated successfully");
      await refetchSettings();
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchShifts(), refetchSettings()]);
    toast.success("Settings refreshed");
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance › Settings"
        title="Attendance Settings"
        description="Shifts, geo-fence radius and verification rules."
        actions={
          <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Tabs defaultValue="shifts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shifts" className="gap-2">
            <Clock className="h-4 w-4" />
            Shift Configurations
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="mt-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Shift Configurations</CardTitle>
                  <CardDescription>Manage work shifts and their properties</CardDescription>
                </div>
                <Dialog open={addShiftOpen} onOpenChange={setAddShiftOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Shift</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Shift Name *</Label>
                        <Input
                          placeholder="e.g., Morning Shift"
                          className="mt-1 h-10"
                          value={newShift.shiftName}
                          onChange={(e) => setNewShift({ ...newShift, shiftName: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Start Time *</Label>
                          <Input
                            type="time"
                            className="mt-1 h-10"
                            value={newShift.startTime}
                            onChange={(e) =>
                              setNewShift({ ...newShift, startTime: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">End Time *</Label>
                          <Input
                            type="time"
                            className="mt-1 h-10"
                            value={newShift.endTime}
                            onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Grace Period (Minutes) *</Label>
                        <Input
                          type="number"
                          placeholder="15"
                          className="mt-1 h-10"
                          value={newShift.gracePeriodMinutes}
                          onChange={(e) =>
                            setNewShift({ ...newShift, gracePeriodMinutes: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Geofence Radius (meters) *</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          className="mt-1 h-10"
                          value={newShift.geofenceRadius}
                          onChange={(e) =>
                            setNewShift({ ...newShift, geofenceRadius: e.target.value })
                          }
                        />
                      </div>
                      <Button
                        onClick={handleCreateShift}
                        disabled={createShiftMutation.isPending}
                        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                      >
                        {createShiftMutation.isPending ? "Creating..." : "Create Shift"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-12 font-semibold">Shift Name</TableHead>
                      <TableHead className="h-12 font-semibold">Start Time</TableHead>
                      <TableHead className="h-12 font-semibold">End Time</TableHead>
                      <TableHead className="h-12 font-semibold">Grace Period</TableHead>
                      <TableHead className="h-12 font-semibold">Geofence</TableHead>
                      <TableHead className="h-12 font-semibold text-center">GPS</TableHead>
                      <TableHead className="h-12 font-semibold text-center">Photo</TableHead>
                      <TableHead className="h-12 font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : shifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No shifts configured.
                        </TableCell>
                      </TableRow>
                    ) : (
                      shifts.map((shift) => (
                        <TableRow key={shift.id} className="hover:bg-muted/50 border-b">
                          <TableCell className="py-4 font-semibold">{shift.shiftName}</TableCell>
                          <TableCell className="py-4 text-sm">
                            {editingShift === shift.id ? (
                              <Input
                                type="time"
                                value={editValues[`shift-${shift.id}-start`]}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    [`shift-${shift.id}-start`]: e.target.value,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            ) : (
                              shift.startTime
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-sm">
                            {editingShift === shift.id ? (
                              <Input
                                type="time"
                                value={editValues[`shift-${shift.id}-end`]}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    [`shift-${shift.id}-end`]: e.target.value,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            ) : (
                              shift.endTime
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-sm">
                            {editingShift === shift.id ? (
                              <Input
                                type="number"
                                value={editValues[`shift-${shift.id}-grace`]}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    [`shift-${shift.id}-grace`]: e.target.value,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            ) : (
                              `${shift.gracePeriodMinutes} min`
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-sm font-medium">
                            {shift.geofenceRadius}m
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                shift.requiresGPS
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {shift.requiresGPS ? "Yes" : "No"}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                shift.requiresPhoto
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {shift.requiresPhoto ? "Yes" : "No"}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-right space-x-2 flex justify-end">
                            {editingShift === shift.id ? (
                              <>
                                <Button
                                  size="sm"
                                  className="gap-1 bg-brand text-brand-foreground hover:bg-brand/90"
                                  onClick={() => handleSaveShift(shift.id)}
                                >
                                  <Save className="h-3 w-3" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingShift(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => handleEditShift(shift.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete "{shift.shiftName}"?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This permanently removes the shift configuration. Employees
                                        currently assigned to this shift will lose their shift
                                        assignment. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-white hover:bg-destructive/90"
                                        onClick={() => handleDeleteShift(shift.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card className="border-border">
            <CardHeader>
              <div>
                <CardTitle className="text-base">System Settings</CardTitle>
                <CardDescription>Configure global attendance system parameters</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settingsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : settings.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No settings configured.
                  </div>
                ) : (
                  settings.map((setting) => (
                    <div
                      key={setting.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/30 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1 text-sm">{setting.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {setting.description}
                          </p>
                          {editingSetting !== setting.id && (
                            <div className="text-sm bg-muted px-3 py-2 rounded font-mono border border-muted-foreground/20">
                              {setting.value}
                            </div>
                          )}
                        </div>
                        {editingSetting === setting.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSetting(null)}
                            className="mt-1"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 mt-1"
                            onClick={() => handleEditSetting(setting.id)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                      </div>
                      {editingSetting === setting.id && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <div>
                            <Label className="text-xs font-medium mb-2 block">New Value</Label>
                            <Input
                              value={editValues[`setting-${setting.id}`] || ""}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  [`setting-${setting.id}`]: e.target.value,
                                })
                              }
                              placeholder="Enter new value"
                              className="h-10"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSetting(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveSetting(setting.id)}
                              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
