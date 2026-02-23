import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Users,
  Loader2,
  Search,
  UserPlus,
  ClipboardList,
  Check,
  X,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface UserWithRole extends Profile {
  role?: AppRole | null;
  role_id?: string;
}

export default function AdminPage() {
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<(Prescription & { patient_name?: string; prescriber_name?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("nurse");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      fetchData();
    }
  }, [userRole]);

  const fetchData = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*");

      // Merge profiles with roles
      const usersWithRoles: UserWithRole[] = (profilesData || []).map((profile) => {
        const roleRecord = rolesData?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: roleRecord?.role || null,
          role_id: roleRecord?.id,
        };
      });

      setUsers(usersWithRoles);

      // Fetch pending prescriptions with patient info
      const { data: prescriptionsData } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (prescriptionsData && prescriptionsData.length > 0) {
        // Get patient names
        const patientIds = [...new Set(prescriptionsData.map((p) => p.patient_id))];
        const prescriberIds = [...new Set(prescriptionsData.map((p) => p.prescribed_by))];

        const [patientsRes, prescribersRes] = await Promise.all([
          supabase.from("patients").select("id, full_name").in("id", patientIds),
          supabase.from("profiles").select("id, full_name").in("id", prescriberIds),
        ]);

        const patientMap = new Map(patientsRes.data?.map((p) => [p.id, p.full_name]));
        const prescriberMap = new Map(prescribersRes.data?.map((p) => [p.id, p.full_name]));

        setPendingPrescriptions(
          prescriptionsData.map((rx) => ({
            ...rx,
            patient_name: patientMap.get(rx.patient_id) || "Unknown",
            prescriber_name: prescriberMap.get(rx.prescribed_by) || "Unknown",
          }))
        );
      } else {
        setPendingPrescriptions([]);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      if (selectedUser.role_id) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("id", selectedUser.role_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUser.id,
            role: selectedRole,
            assigned_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Role assigned",
        description: `${selectedUser.full_name || selectedUser.email} is now a ${selectedRole}.`,
      });

      setAssignDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRole = async (userWithRole: UserWithRole) => {
    if (!userWithRole.role_id) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", userWithRole.role_id);

      if (error) throw error;

      toast({
        title: "Role removed",
        description: `${userWithRole.full_name || userWithRole.email} no longer has a role.`,
      });

      fetchData();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrescriptionAction = async (prescriptionId: string, action: "approved" | "rejected", reason?: string) => {
    setActionLoading(true);
    try {
      const updateData: any = {
        status: action,
        approved_by: action === "approved" ? user.id : null,
      };

      if (action === "rejected" && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("prescriptions")
        .update(updateData)
        .eq("id", prescriptionId);

      if (error) throw error;

      toast({
        title: action === "approved" ? "Prescription approved" : "Prescription rejected",
        description: action === "approved" 
          ? "The antibiotic prescription has been approved."
          : "The prescription has been rejected.",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error updating prescription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update prescription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      searchQuery === "" ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roles: AppRole[] = ["doctor", "nurse", "admin"];

  const roleColors: Record<AppRole, string> = {
    admin: "bg-primary text-primary-foreground",
    doctor: "bg-risk-moderate text-black",
    nurse: "bg-success text-white",
  };

  if (userRole !== "admin") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Shield className="w-12 h-12 text-destructive/50 mb-4" />
        <p className="text-muted-foreground">Admin access required</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage user roles and review restricted prescriptions
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            User Management ({users.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Pending Reviews ({pendingPrescriptions.length})
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>
                Assign roles to users to grant them access to clinical features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Users Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.full_name || "-"}
                          </TableCell>
                          <TableCell>{u.email || "-"}</TableCell>
                          <TableCell>
                            {u.role ? (
                              <Badge className={roleColors[u.role]}>
                                {u.role}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                No role
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{u.department || "-"}</TableCell>
                          <TableCell>
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setSelectedRole(u.role || "nurse");
                                  setAssignDialogOpen(true);
                                }}
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                {u.role ? "Change" : "Assign"}
                              </Button>
                              {u.role && u.id !== user.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveRole(u)}
                                  disabled={actionLoading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
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

        {/* Pending Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Restricted Antibiotic Reviews
              </CardTitle>
              <CardDescription>
                Review and approve restricted antibiotic prescriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPrescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending reviews</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPrescriptions.map((rx) => (
                    <Card key={rx.id} className="border-warning/30 bg-warning/5">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">{rx.antibiotic_name}</span>
                              {rx.is_restricted && (
                                <Badge variant="destructive">Restricted</Badge>
                              )}
                              {rx.is_broad_spectrum && (
                                <Badge variant="secondary">Broad Spectrum</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium">Patient:</span> {rx.patient_name}
                              </p>
                              <p>
                                <span className="font-medium">Prescribed by:</span> {rx.prescriber_name}
                              </p>
                              <p>
                                <span className="font-medium">Dose:</span> {rx.dose} {rx.route} {rx.frequency}
                              </p>
                              <p>
                                <span className="font-medium">Duration:</span> {rx.duration_days} days
                              </p>
                              <p>
                                <span className="font-medium">Indication:</span>{" "}
                                {rx.infection_site?.toUpperCase()} - {rx.clinical_setting?.toUpperCase()}
                              </p>
                            </div>
                            {rx.justification && (
                              <div className="mt-3 p-3 rounded-lg bg-muted/50">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Justification:
                                </p>
                                <p className="text-sm">{rx.justification}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handlePrescriptionAction(rx.id, "rejected", "Clinical review: alternative therapy recommended")}
                              disabled={actionLoading}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              className="bg-success hover:bg-success/90 text-white"
                              onClick={() => handlePrescriptionAction(rx.id, "approved")}
                              disabled={actionLoading}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <span className="capitalize">{role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === "doctor" && "Doctors can prescribe antibiotics and review lab reports"}
                {selectedRole === "nurse" && "Nurses can view patients, upload lab reports, and view prescriptions"}
                {selectedRole === "admin" && "Admins can manage users and review restricted prescriptions"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={actionLoading} className="gradient-primary">
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Assign Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
