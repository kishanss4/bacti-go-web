import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  FileText,
  ClipboardList,
  Plus,
  Activity,
  Phone,
  MapPin,
  Calendar,
  Weight,
  Pill,
  Heart,
  ShieldAlert,
  Edit,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type LabReport = Database["public"]["Tables"]["lab_reports"]["Row"];
type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [discharging, setDischarging] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState("");

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      // Fetch patient
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch lab reports
      const { data: reportsData } = await supabase
        .from("lab_reports")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      setLabReports(reportsData || []);

      // Fetch prescriptions
      const { data: prescriptionsData } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      setPrescriptions(prescriptionsData || []);
    } catch (error: any) {
      console.error("Error fetching patient:", error);
      toast({
        title: "Error",
        description: "Failed to load patient data",
        variant: "destructive",
      });
      navigate("/patients");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <User className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Patient not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  const typeLabels: Record<string, { label: string; className: string }> = {
    type_1: { label: "Type 1 - Low Risk", className: "bg-risk-low text-white" },
    type_2: { label: "Type 2 - Moderate", className: "bg-risk-moderate text-black" },
    type_3: { label: "Type 3 - High Risk", className: "bg-risk-high text-white" },
    type_4: { label: "Type 4 - Critical", className: "bg-risk-critical text-white" },
  };

  const patientTypeConfig = typeLabels[patient.patient_type || "type_1"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{patient.full_name}</h1>
            {patient.has_septic_shock && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Septic Shock
              </Badge>
            )}
            <Badge className={patientTypeConfig.className}>
              {patientTypeConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {patient.age}y {patient.gender} • {patient.patient_id || "No ID"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Edit button - only for doctors or creator */}
          {(userRole === "doctor" || patient.created_by === user?.id) && patient.status === "active" && (
            <Button variant="outline" onClick={() => navigate(`/patients/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/lab-reports/new?patient=${id}`)}>
            <FileText className="w-4 h-4 mr-2" />
            Add Lab Report
          </Button>
          {userRole === "doctor" && patient.status === "active" && (
            <Button className="gradient-primary" onClick={() => navigate(`/prescriptions/new?patient=${id}`)}>
              <Pill className="w-4 h-4 mr-2" />
              Prescribe
            </Button>
          )}
          {/* Discharge button - only for doctors on active patients */}
          {userRole === "doctor" && patient.status === "active" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary">
                  <LogOut className="w-4 h-4 mr-2" />
                  Discharge
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discharge Patient</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark {patient.full_name} as discharged. Add any discharge notes below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Discharge notes (optional)..."
                    value={dischargeNotes}
                    onChange={(e) => setDischargeNotes(e.target.value)}
                    rows={4}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDischarging(true);
                      try {
                        const { error } = await supabase
                          .from("patients")
                          .update({
                            status: "discharged",
                            discharge_date: new Date().toISOString(),
                          })
                          .eq("id", id);

                        if (error) throw error;

                        toast({
                          title: "Patient discharged",
                          description: `${patient.full_name} has been discharged successfully.`,
                        });
                        
                        // Refresh patient data
                        fetchPatientData();
                      } catch (error: any) {
                        console.error("Error discharging patient:", error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to discharge patient",
                          variant: "destructive",
                        });
                      } finally {
                        setDischarging(false);
                        setDischargeNotes("");
                      }
                    }}
                    disabled={discharging}
                  >
                    {discharging ? "Discharging..." : "Confirm Discharge"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Discharged badge */}
          {patient.status === "discharged" && (
            <Badge variant="secondary" className="h-9 px-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Discharged {patient.discharge_date && `on ${new Date(patient.discharge_date).toLocaleDateString()}`}
            </Badge>
          )}
        </div>
      </div>

      {/* Patient Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {patient.ward ? `${patient.ward} / Bed ${patient.bed_number || "-"}` : "Not assigned"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission</p>
                <p className="font-medium">
                  {patient.admission_date
                    ? new Date(patient.admission_date).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Weight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-medium">
                  {patient.weight ? `${patient.weight} kg` : "Not recorded"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="labs">
            Lab Reports ({labReports.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Prescriptions ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="risk">Risk Factors</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact & Demographics */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age</span>
                  <span>{patient.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender</span>
                  <span className="capitalize">{patient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{patient.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renal Function</span>
                  <span className="capitalize">{patient.renal_function}</span>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Info */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Clinical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Known Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {patient.known_allergies && patient.known_allergies.length > 0 ? (
                      patient.known_allergies.map((allergy, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No known allergies</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Comorbidities</p>
                  <div className="flex flex-wrap gap-1">
                    {patient.comorbidities && patient.comorbidities.length > 0 ? (
                      patient.comorbidities.map((condition, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None recorded</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lab Reports Tab */}
        <TabsContent value="labs" className="space-y-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Lab Reports</CardTitle>
                <CardDescription>Culture and sensitivity results</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/lab-reports/new?patient=${id}`)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Report
              </Button>
            </CardHeader>
            <CardContent>
              {labReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No lab reports yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate(`/lab-reports/new?patient=${id}`)}
                  >
                    Upload First Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {labReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 rounded-lg bg-muted/50 flex items-center justify-between cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/lab-reports/${report.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{report.report_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.specimen_type} •{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={report.status === "pending" ? "secondary" : "default"}
                      >
                        {report.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Prescriptions</CardTitle>
                <CardDescription>Antibiotic therapy history</CardDescription>
              </div>
              {userRole === "doctor" && (
                <Button
                  size="sm"
                  className="gradient-primary"
                  onClick={() => navigate(`/prescriptions/new?patient=${id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Prescription
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No prescriptions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Pill className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{rx.antibiotic_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {rx.dose} {rx.route} {rx.frequency}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          rx.status === "approved"
                            ? "default"
                            : rx.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {rx.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Factors Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-warning" />
                Risk Factor Assessment
              </CardTitle>
              <CardDescription>
                Factors used to calculate patient risk stratification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RiskFactorItem
                  label="Community-Acquired Infection"
                  value={patient.is_community_acquired}
                />
                <RiskFactorItem
                  label="Healthcare Contact (90 days)"
                  value={patient.has_healthcare_contact}
                  warning
                />
                <RiskFactorItem
                  label="Prior Antibiotics (90 days)"
                  value={patient.has_prior_antibiotics_90_days}
                  warning
                />
                <RiskFactorItem
                  label="Hospitalized ≥5 days"
                  value={(patient.hospitalized_days || 0) >= 5}
                  warning
                />
                <RiskFactorItem
                  label="Invasive Procedures"
                  value={patient.has_invasive_procedures}
                  warning
                />
                <RiskFactorItem
                  label="Immunocompromised"
                  value={patient.is_immunocompromised}
                  warning
                />
                <RiskFactorItem
                  label="Persistent Fever (>48h)"
                  value={patient.has_persistent_fever}
                  warning
                />
                <RiskFactorItem
                  label="Septic Shock"
                  value={patient.has_septic_shock}
                  critical
                />
                <RiskFactorItem
                  label="Elderly (≥65 years)"
                  value={patient.is_elderly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiskFactorItem({
  label,
  value,
  warning,
  critical,
}: {
  label: string;
  value: boolean | null;
  warning?: boolean;
  critical?: boolean;
}) {
  const isActive = value === true;
  return (
    <div
      className={`p-3 rounded-lg border ${
        isActive
          ? critical
            ? "bg-destructive/10 border-destructive/30"
            : warning
            ? "bg-warning/10 border-warning/30"
            : "bg-primary/10 border-primary/30"
          : "bg-muted/30 border-border/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={
            isActive
              ? critical
                ? "bg-destructive"
                : warning
                ? "bg-warning text-black"
                : "bg-success"
              : ""
          }
        >
          {isActive ? "Yes" : "No"}
        </Badge>
      </div>
    </div>
  );
}
