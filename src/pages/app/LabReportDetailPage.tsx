import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Pill,
  User,
  Calendar,
  FlaskConical,
  Microscope,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type LabReport = Database["public"]["Tables"]["lab_reports"]["Row"];
type Patient = Database["public"]["Tables"]["patients"]["Row"];

interface Sensitivity {
  organism: string;
  antibiotic: string;
  result: "S" | "R" | "I";
}

interface Organism {
  name: string;
}

export default function LabReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<LabReport | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [status, setStatus] = useState<string>("pending");

  useEffect(() => {
    if (id) {
      fetchReport();
    }
  }, [id]);

  const fetchReport = async () => {
    try {
      const { data: reportData, error } = await supabase
        .from("lab_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setReport(reportData);
      setDoctorNotes(reportData.doctor_notes || "");
      setStatus(reportData.status || "pending");

      // Fetch patient
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", reportData.patient_id)
        .single();

      setPatient(patientData);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      toast({
        title: "Error",
        description: "Failed to load lab report",
        variant: "destructive",
      });
      navigate("/lab-reports");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async () => {
    if (!report) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("lab_reports")
        .update({
          doctor_notes: doctorNotes,
          status: status,
          reviewed_by: user.id,
        })
        .eq("id", report.id);

      if (error) throw error;

      toast({
        title: "Report updated",
        description: "Your review has been saved.",
      });

      fetchReport();
    } catch (error: any) {
      console.error("Error saving review:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save review",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Report not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/lab-reports")}>
          Back to Lab Reports
        </Button>
      </div>
    );
  }

  const organisms = (report.organisms as unknown as Organism[]) || [];
  const sensitivities = (report.sensitivities as unknown as Sensitivity[]) || [];

  // Group sensitivities by organism
  const sensitivityByOrganism = organisms.map((org) => ({
    name: org.name,
    sensitivities: sensitivities.filter((s) => s.organism === org.name),
  }));

  const statusColors: Record<string, string> = {
    pending: "bg-warning/20 text-warning border-warning/30",
    reviewed: "bg-primary/20 text-primary border-primary/30",
    confirmed: "bg-success/20 text-success border-success/30",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {report.report_type}
            </h1>
            <Badge className={statusColors[report.status || "pending"]} variant="outline">
              {report.status}
            </Badge>
            {report.is_mdr && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                MDR Pathogen
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {report.specimen_type} • Collected{" "}
            {report.specimen_date
              ? new Date(report.specimen_date).toLocaleDateString()
              : "Date unknown"}
          </p>
        </div>
        {userRole === "doctor" && (
          <Button
            className="gradient-primary"
            onClick={() => navigate(`/prescriptions/new?patient=${report.patient_id}&report=${report.id}`)}
          >
            <Pill className="w-4 h-4 mr-2" />
            Prescribe Based on Results
          </Button>
        )}
      </div>

      {/* Patient Info */}
      {patient && (
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{patient.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {patient.age}y {patient.gender} • {patient.patient_id || "No ID"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${patient.id}`)}>
                View Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Specimen Type</p>
              <p className="font-medium">{report.specimen_type || "Not specified"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Report Date</p>
              <p className="font-medium">{new Date(report.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Microscope className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Organisms Isolated</p>
              <p className="font-medium">{organisms.length} organism(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MDR Alert */}
      {report.is_mdr && report.mdr_type && report.mdr_type.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Multi-Drug Resistant Pathogen Detected</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {report.mdr_type.map((type, i) => (
                  <Badge key={i} variant="destructive">
                    {type}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Infection control measures may be required. Consider ID consultation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organisms & Sensitivities */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            Culture Results
          </CardTitle>
          <CardDescription>Isolated organisms and antibiotic sensitivities</CardDescription>
        </CardHeader>
        <CardContent>
          {organisms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Microscope className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No organisms recorded</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sensitivityByOrganism.map((org, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h4 className="font-semibold text-lg">{org.name}</h4>
                  </div>

                  {org.sensitivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-4">
                      No sensitivity data available
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pl-4">
                      {org.sensitivities.map((s, j) => (
                        <div
                          key={j}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            s.result === "S"
                              ? "bg-success/10 border-success/30"
                              : s.result === "R"
                              ? "bg-destructive/10 border-destructive/30"
                              : "bg-warning/10 border-warning/30"
                          }`}
                        >
                          <span className="text-sm font-medium truncate">{s.antibiotic}</span>
                          <Badge
                            variant={
                              s.result === "S"
                                ? "default"
                                : s.result === "R"
                                ? "destructive"
                                : "secondary"
                            }
                            className={s.result === "S" ? "bg-success" : ""}
                          >
                            {s.result}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-4 pt-4 border-t border-border text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-success">S</Badge>
                  <span className="text-muted-foreground">Sensitive</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">I</Badge>
                  <span className="text-muted-foreground">Intermediate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">R</Badge>
                  <span className="text-muted-foreground">Resistant</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Review Section */}
      {userRole === "doctor" && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Doctor Review
            </CardTitle>
            <CardDescription>Add clinical notes and update report status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Add clinical interpretation, recommendations, or follow-up notes..."
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveReview} disabled={saving} className="gradient-primary">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Notes */}
      {report.doctor_notes && userRole !== "doctor" && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Doctor's Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.doctor_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
