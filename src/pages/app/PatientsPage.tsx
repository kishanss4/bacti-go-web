import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Search,
  AlertTriangle,
  User,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { useProfileNames } from "@/hooks/useProfileNames";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];

export default function PatientsPage() {
  const { userRole } = useAppContext();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const profileNames = useProfileNames(patients.map((p) => p.created_by));

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.ward?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPatientTypeBadge = (type: string | null) => {
    const types: Record<string, { label: string; className: string }> = {
      type_1: { label: "Type 1 - Low Risk", className: "bg-risk-low text-white" },
      type_2: { label: "Type 2 - Moderate", className: "bg-risk-moderate text-black" },
      type_3: { label: "Type 3 - High Risk", className: "bg-risk-high text-white" },
      type_4: { label: "Type 4 - Critical", className: "bg-risk-critical text-white" },
    };
    const config = types[type || "type_1"] || types.type_1;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <Badge variant="default" className="bg-success">Active</Badge>;
    }
    if (status === "discharged") {
      return <Badge variant="secondary">Discharged</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Patients
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage patient cases and records
          </p>
        </div>
        <Button
          className="gradient-primary"
          onClick={() => navigate("/patients/new")}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Patient
        </Button>
      </div>

      {/* Search */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or ward..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Patient List</CardTitle>
          <CardDescription>
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No patients found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "Add your first patient to get started"}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4 gradient-primary"
                  onClick={() => navigate("/patients/new")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Patient
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Patient</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Ward/Bed</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Risk Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {patient.age}y, {patient.gender}
                            </p>
                          </div>
                          {patient.has_septic_shock && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {patient.patient_id || "-"}
                      </TableCell>
                      <TableCell>
                        {patient.ward ? `${patient.ward} / ${patient.bed_number || "-"}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {profileNames[patient.created_by] || "—"}
                      </TableCell>
                      <TableCell>
                        {getPatientTypeBadge(patient.patient_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(patient.status)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
