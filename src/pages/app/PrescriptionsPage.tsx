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
  ClipboardList,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  AlertTriangle,
  User,
  Pill,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];

interface PrescriptionWithPatient extends Prescription {
  patients?: { full_name: string; patient_id: string | null };
}

export default function PrescriptionsPage() {
  const { userRole } = useAppContext();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients (full_name, patient_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter(
    (rx) =>
      rx.patients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.patients?.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.antibiotic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Prescriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Antibiotic prescription management
          </p>
        </div>
        {userRole === "doctor" && (
          <Button
            className="gradient-primary"
            onClick={() => navigate("/prescriptions/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Prescription
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient or antibiotic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions Table */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Prescription List</CardTitle>
          <CardDescription>
            {filteredPrescriptions.length} prescription{filteredPrescriptions.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No prescriptions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "No prescriptions have been created yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Antibiotic</TableHead>
                    <TableHead>Dose & Route</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map((rx) => (
                    <TableRow
                      key={rx.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/prescriptions/${rx.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {rx.patients?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rx.patients?.patient_id || "-"}
                            </p>
                          </div>
                          {rx.is_restricted && (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-primary" />
                          <span className="font-medium">{rx.antibiotic_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rx.dose} {rx.route}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rx.frequency}
                      </TableCell>
                      <TableCell>{getStatusBadge(rx.status)}</TableCell>
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
