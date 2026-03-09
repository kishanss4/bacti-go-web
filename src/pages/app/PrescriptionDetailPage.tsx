import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Pill,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2, FileText, Stethoscope, Shield, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { notifyPrescriptionApproved, notifyPrescriptionRejected } from "@/lib/notifications";
import type { Database } from "@/integrations/supabase/types";

type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];

interface PrescriptionWithDetails extends Prescription {
  patients?: {
    full_name: string;
    patient_id: string | null;
    age: number;
    gender: string;
    known_allergies: string[] | null;
  } | null;
  prescriber?: { full_name: string | null } | null;
  approver?: { full_name: string | null } | null;
  lab_reports?: { id: string; report_type: string } | null;
}

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  
  const [prescription, setPrescription] = useState<PrescriptionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (id) {
      fetchPrescription();
    }
  }, [id]);

  const fetchPrescription = async () => {
    try {
      // Fetch prescription data
      const { data: rxData, error: rxError } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients (full_name, patient_id, age, gender, known_allergies),
          lab_reports (id, report_type)
        `)
        .eq("id", id)
        .single();

      if (rxError) throw rxError;

      // Fetch prescriber and approver profiles separately
      let prescriber = null;
      let approver = null;

      if (rxData.prescribed_by) {
        const { data: prescriberData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", rxData.prescribed_by)
          .single();
        prescriber = prescriberData;
      }

      if (rxData.approved_by) {
        const { data: approverData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", rxData.approved_by)
          .single();
        approver = approverData;
      }

      setPrescription({ ...rxData, prescriber, approver });
    } catch (error) {
      console.error("Error fetching prescription:", error);
      toast({
        title: "Error",
        description: "Failed to load prescription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!prescription) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({
          status: "approved",
          approved_by: user.id,
        })
        .eq("id", prescription.id);

      if (error) throw error;

      await logAction("UPDATE", "prescriptions", prescription.id, { status: "approved" });

      await notifyPrescriptionApproved(
        prescription.prescribed_by,
        prescription.antibiotic_name,
        prescription.id,
        prescription.patients?.full_name || "Unknown"
      );

      toast({
        title: "Prescription approved",
        description: "The prescription has been approved.",
      });

      fetchPrescription();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve prescription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!prescription || !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          approved_by: user.id,
        })
        .eq("id", prescription.id);

      if (error) throw error;

      await logAction("UPDATE", "prescriptions", prescription.id, { 
        status: "rejected", 
        rejection_reason: rejectionReason 
      });

      await notifyPrescriptionRejected(
        prescription.prescribed_by,
        prescription.antibiotic_name,
        prescription.id,
        prescription.patients?.full_name || "Unknown",
        rejectionReason
      );

      toast({
        title: "Prescription rejected",
        description: "The prescription has been rejected with reason.",
      });

      fetchPrescription();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject prescription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setRejectionReason("");
    }
  };

  const handleComplete = async () => {
    if (!prescription) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({
          status: "completed",
          end_date: new Date().toISOString(),
        })
        .eq("id", prescription.id);

      if (error) throw error;

      await logAction("UPDATE", "prescriptions", prescription.id, { status: "completed" });

      toast({
        title: "Prescription completed",
        description: "The prescription course has been marked complete.",
      });

      fetchPrescription();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete prescription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatInfectionSite = (site: string) => {
    return site.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Prescription not found</p>
        <Button variant="link" onClick={() => navigate("/prescriptions")}>
          Back to Prescriptions
        </Button>
      </div>
    );
  }

  const canApprove = userRole === "admin" || (userRole === "doctor" && prescription.prescribed_by !== user.id);
  const isPending = prescription.status === "pending";
  const isApproved = prescription.status === "approved";
  const warningsAcknowledged = prescription.warnings_acknowledged as string[] || [];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            Prescription Details
          </h1>
          <p className="text-muted-foreground mt-1">
            {prescription.antibiotic_name}
          </p>
        </div>
        {getStatusBadge(prescription.status)}
      </div>

      {/* Rejection Notice */}
      {prescription.status === "rejected" && prescription.rejection_reason && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Prescription Rejected</p>
              <p className="text-sm text-muted-foreground mt-1">
                {prescription.rejection_reason}
              </p>
              {prescription.approver?.full_name && (
                <p className="text-xs text-muted-foreground mt-2">
                  — {prescription.approver.full_name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Info */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{prescription.patients?.full_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient ID</p>
              <p className="font-medium">{prescription.patients?.patient_id || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Age / Gender</p>
              <p className="font-medium">
                {prescription.patients?.age}y / {prescription.patients?.gender}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allergies</p>
              <p className="font-medium">
                {prescription.patients?.known_allergies?.join(", ") || "None recorded"}
              </p>
            </div>
          </div>
          <Button
            variant="link"
            className="px-0 mt-2"
            onClick={() => navigate(`/patients/${prescription.patient_id}`)}
          >
            View Patient Profile →
          </Button>
        </CardContent>
      </Card>

      {/* Prescription Details */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Medication Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Antibiotic</p>
              <p className="font-medium text-lg">{prescription.antibiotic_name}</p>
              {prescription.antibiotic_class && (
                <p className="text-xs text-muted-foreground">{prescription.antibiotic_class}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dose</p>
              <p className="font-medium">{prescription.dose}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="font-medium">{prescription.route}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Frequency</p>
              <p className="font-medium">{prescription.frequency}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{prescription.duration_days || "-"} days</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Infection Site</p>
              <p className="font-medium">{formatInfectionSite(prescription.infection_site)}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Clinical Setting</p>
              <p className="font-medium">{formatInfectionSite(prescription.clinical_setting)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(prescription.start_date).toLocaleDateString()}
              </p>
            </div>
            {prescription.end_date && (
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {new Date(prescription.end_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {prescription.is_broad_spectrum && (
              <Badge variant="secondary">Broad Spectrum</Badge>
            )}
            {prescription.is_restricted && (
              <Badge variant="destructive">Restricted</Badge>
            )}
            {prescription.requires_justification && (
              <Badge variant="outline" className="border-warning text-warning">
                Requires Justification
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      {(prescription.justification || prescription.culture_decision_notes) && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Clinical Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescription.justification && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Justification</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{prescription.justification}</p>
              </div>
            )}
            {prescription.culture_decision_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Culture Decision</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{prescription.culture_decision_notes}</p>
              </div>
            )}
            {prescription.lab_reports && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Lab Report</p>
                <Button
                  variant="link"
                  className="px-0 h-auto"
                  onClick={() => navigate(`/lab-reports/${prescription.lab_reports?.id}`)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {prescription.lab_reports.report_type}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warnings Acknowledged */}
      {warningsAcknowledged.length > 0 && (
        <Card className="glass border-warning/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Acknowledged Warnings
            </CardTitle>
            <CardDescription>The prescriber acknowledged these safety warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warningsAcknowledged.map((warning, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Prescriber Info */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Prescription Authorization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Prescribed By</p>
              <p className="font-medium">{prescription.prescriber?.full_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(prescription.created_at).toLocaleString()}
              </p>
            </div>
            {prescription.approved_by && (
              <div>
                <p className="text-xs text-muted-foreground">
                  {prescription.status === "rejected" ? "Rejected By" : "Approved By"}
                </p>
                <p className="font-medium">{prescription.approver?.full_name || "Unknown"}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canApprove && isPending && (
        <Card className="glass border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">Stewardship Review</CardTitle>
            <CardDescription>
              Review and approve or reject this prescription
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Approve Prescription
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={actionLoading}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Prescription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Prescription</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please provide a reason for rejection. This will be visible to the prescriber.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                  >
                    Confirm Rejection
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Complete Button for approved prescriptions */}
      {isApproved && userRole === "doctor" && (
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Mark Course Complete</p>
              <p className="text-xs text-muted-foreground">
                When the antibiotic course has finished
              </p>
            </div>
            <Button variant="outline" onClick={handleComplete} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Prescription - Doctors & Admins */}
      {(userRole === "doctor" || userRole === "admin") && (
        <Card className="border-destructive/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Prescription</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove this prescription record
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={actionLoading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Prescription</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this prescription. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const { error } = await supabase
                          .from("prescriptions")
                          .delete()
                          .eq("id", prescription.id);
                        if (error) throw error;
                        await logAction("DELETE", "prescriptions", prescription.id);
                        toast({
                          title: "Prescription deleted",
                          description: "The prescription has been permanently deleted.",
                        });
                        navigate("/prescriptions");
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to delete prescription",
                          variant: "destructive",
                        });
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    Delete Prescription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
