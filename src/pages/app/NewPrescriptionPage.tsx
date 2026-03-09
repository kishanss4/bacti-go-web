import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pill,
  Loader2,
  ArrowLeft,
  User,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ShieldAlert,
  FileText,
  Stethoscope,
  Info,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { notifyRestrictedPrescription } from "@/lib/notifications";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type LabReport = Database["public"]["Tables"]["lab_reports"]["Row"];
type Guideline = Database["public"]["Tables"]["antibiotic_guidelines"]["Row"];
type InfectionSite = Database["public"]["Enums"]["infection_site"];
type ClinicalSetting = Database["public"]["Enums"]["clinical_setting"];

interface AntibioticOption {
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  class?: string;
  isFirstLine: boolean;
  source: "guideline" | "culture";
  sensitivityResult?: "S" | "R" | "I";
}

interface SafetyWarning {
  type: "allergy" | "contraindication" | "renal" | "interaction" | "restricted";
  severity: "error" | "warning" | "info";
  message: string;
  requiresAcknowledgment: boolean;
}

export default function NewPrescriptionPage() {
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientLabReports, setPatientLabReports] = useState<LabReport[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    patient_id: searchParams.get("patient") || "",
    infection_site: "" as InfectionSite | "",
    clinical_setting: "" as ClinicalSetting | "",
    antibiotic_name: "",
    antibiotic_class: "",
    dose: "",
    route: "iv",
    frequency: "",
    duration_days: 7,
    start_date: new Date().toISOString().split("T")[0],
    is_broad_spectrum: false,
    is_restricted: false,
    requires_justification: false,
    justification: "",
    culture_based_decision: "empiric" as "empiric" | "culture_guided" | "de_escalation",
    culture_decision_notes: "",
    lab_report_id: "",
  });
  
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<string[]>([]);
  const [selectedLabReport, setSelectedLabReport] = useState<LabReport | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.patient_id) {
      fetchPatientDetails(formData.patient_id);
    }
  }, [formData.patient_id]);

  // Auto-set restricted and broad spectrum flags based on antibiotic name
  useEffect(() => {
    if (!formData.antibiotic_name) return;
    const abName = formData.antibiotic_name.toLowerCase();

    const restrictedAntibiotics = ["meropenem", "imipenem", "vancomycin", "linezolid", "colistin", "tigecycline"];
    const isRestricted = restrictedAntibiotics.some((ab) => abName.includes(ab));

    const broadSpectrum = ["piperacillin-tazobactam", "meropenem", "imipenem", "ceftriaxone", "ciprofloxacin", "levofloxacin"];
    const isBroad = broadSpectrum.some((ab) => abName.includes(ab));

    setFormData((prev) => ({
      ...prev,
      is_restricted: isRestricted || prev.is_restricted,
      requires_justification: isRestricted || prev.requires_justification,
      is_broad_spectrum: isBroad || prev.is_broad_spectrum,
    }));
  }, [formData.antibiotic_name]);

  const fetchInitialData = async () => {
    try {
      const [patientsRes, guidelinesRes] = await Promise.all([
        supabase.from("patients").select("*").eq("status", "active").order("full_name"),
        supabase.from("antibiotic_guidelines").select("*"),
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (guidelinesRes.error) throw guidelinesRes.error;

      setPatients(patientsRes.data || []);
      setGuidelines(guidelinesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPatientDetails = async (patientId: string) => {
    try {
      const [patientRes, reportsRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase.from("lab_reports").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
      ]);

      if (patientRes.error) throw patientRes.error;
      
      setSelectedPatient(patientRes.data);
      setPatientLabReports(reportsRes.data || []);
      
      // Auto-set clinical setting based on patient info
      if (patientRes.data.hospitalized_days && patientRes.data.hospitalized_days >= 5) {
        setFormData(prev => ({ ...prev, clinical_setting: "ipd" }));
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
    }
  };

  // Decision Engine: Get recommended antibiotics
  const recommendedAntibiotics = useMemo((): AntibioticOption[] => {
    if (!formData.infection_site || !formData.clinical_setting || !selectedPatient) {
      return [];
    }

    const recommendations: AntibioticOption[] = [];
    
    // Get guidelines matching criteria
    const matchingGuidelines = guidelines.filter(
      (g) =>
        g.infection_site === formData.infection_site &&
        g.clinical_setting === formData.clinical_setting &&
        g.patient_type === selectedPatient.patient_type
    );

    // Add first-line options from guidelines
    matchingGuidelines.forEach((guideline) => {
      if (Array.isArray(guideline.first_line_antibiotics)) {
        (guideline.first_line_antibiotics as any[]).forEach((ab) => {
          recommendations.push({
            name: ab.name || ab,
            dose: ab.dose,
            route: ab.route,
            frequency: ab.frequency,
            class: ab.class,
            isFirstLine: true,
            source: "guideline",
          });
        });
      }
      
      // Add alternative options
      if (Array.isArray(guideline.alternative_antibiotics)) {
        (guideline.alternative_antibiotics as any[]).forEach((ab) => {
          recommendations.push({
            name: ab.name || ab,
            dose: ab.dose,
            route: ab.route,
            frequency: ab.frequency,
            class: ab.class,
            isFirstLine: false,
            source: "guideline",
          });
        });
      }
    });

    // Add culture-guided options if lab report selected
    if (selectedLabReport && Array.isArray(selectedLabReport.sensitivities)) {
      const sensitivities = selectedLabReport.sensitivities as any[];
      sensitivities
        .filter((s) => s.result === "S")
        .forEach((s) => {
          // Check if not already in recommendations
          if (!recommendations.find((r) => r.name === s.antibiotic)) {
            recommendations.push({
              name: s.antibiotic,
              isFirstLine: false,
              source: "culture",
              sensitivityResult: s.result,
            });
          }
        });
    }

    return recommendations;
  }, [formData.infection_site, formData.clinical_setting, selectedPatient, guidelines, selectedLabReport]);

  // Safety checks
  const safetyWarnings = useMemo((): SafetyWarning[] => {
    if (!formData.antibiotic_name || !selectedPatient) return [];

    const warnings: SafetyWarning[] = [];
    const abName = formData.antibiotic_name.toLowerCase();

    // Check allergies
    if (selectedPatient.known_allergies && selectedPatient.known_allergies.length > 0) {
      const allergyMatch = selectedPatient.known_allergies.find((allergy) => {
        const allergyLower = allergy.toLowerCase();
        // Check direct match
        if (abName.includes(allergyLower) || allergyLower.includes(abName)) return true;
        // Check penicillin cross-reactivity
        if (allergyLower.includes("penicillin") && 
            (abName.includes("amoxicillin") || abName.includes("ampicillin") || 
             abName.includes("piperacillin") || abName.includes("penicillin"))) {
          return true;
        }
        // Check cephalosporin cross-reactivity with penicillin
        if (allergyLower.includes("penicillin") && 
            (abName.includes("cef") || abName.includes("ceph"))) {
          return true;
        }
        return false;
      });

      if (allergyMatch) {
        warnings.push({
          type: "allergy",
          severity: "error",
          message: `Patient has documented allergy to "${allergyMatch}". Cross-reactivity possible with ${formData.antibiotic_name}.`,
          requiresAcknowledgment: true,
        });
      }
    }

    // Check renal dosing
    if (selectedPatient.renal_function && selectedPatient.renal_function !== "normal") {
      const renalAdjustmentRequired = ["gentamicin", "vancomycin", "imipenem", "meropenem", "ciprofloxacin"];
      if (renalAdjustmentRequired.some((ab) => abName.includes(ab))) {
        warnings.push({
          type: "renal",
          severity: "warning",
          message: `Renal function is ${selectedPatient.renal_function}. Dose adjustment may be required for ${formData.antibiotic_name}.`,
          requiresAcknowledgment: true,
        });
      }
    }

    // Check restricted antibiotics
    const restrictedAntibiotics = ["meropenem", "imipenem", "vancomycin", "linezolid", "colistin", "tigecycline"];
    if (restrictedAntibiotics.some((ab) => abName.includes(ab))) {
      warnings.push({
        type: "restricted",
        severity: "warning",
        message: `${formData.antibiotic_name} is a restricted antibiotic. Justification required for stewardship review.`,
        requiresAcknowledgment: true,
      });
    }

    // Check culture guidance
    if (selectedLabReport && formData.culture_based_decision === "empiric") {
      const sensitivities = (selectedLabReport.sensitivities as any[]) || [];
      const resistance = sensitivities.find(
        (s) => s.antibiotic.toLowerCase() === abName && s.result === "R"
      );
      if (resistance) {
        warnings.push({
          type: "contraindication",
          severity: "error",
          message: `Culture shows RESISTANCE to ${formData.antibiotic_name}. Consider alternative therapy.`,
          requiresAcknowledgment: true,
        });
      }
    }

    // Check MDR patient
    if (selectedPatient.patient_type === "type_3" || selectedPatient.patient_type === "type_4") {
      if (formData.culture_based_decision === "empiric") {
        warnings.push({
          type: "info" as any,
          severity: "info",
          message: "High-risk patient. Consider broader empiric coverage or await culture results.",
          requiresAcknowledgment: false,
        });
      }
    }

    return warnings;
  }, [formData.antibiotic_name, formData.culture_based_decision, selectedPatient, selectedLabReport]);

  const criticalWarnings = safetyWarnings.filter((w) => w.severity === "error" && w.requiresAcknowledgment);
  const allCriticalAcknowledged = criticalWarnings.every((w) => acknowledgedWarnings.includes(w.message));

  const selectAntibiotic = (option: AntibioticOption) => {
    setFormData((prev) => ({
      ...prev,
      antibiotic_name: option.name,
      antibiotic_class: option.class || "",
      dose: option.dose || prev.dose,
      route: option.route ? ({ "PO": "oral", "IV": "iv", "IM": "im", "SC": "iv", "Topical": "topical" }[option.route] || option.route.toLowerCase()) : prev.route,
      frequency: option.frequency || prev.frequency,
      culture_based_decision: option.source === "culture" ? "culture_guided" : prev.culture_based_decision,
    }));
    setAcknowledgedWarnings([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id || !formData.antibiotic_name) {
      toast({
        title: "Error",
        description: "Please select a patient and antibiotic",
        variant: "destructive",
      });
      return;
    }

    if (criticalWarnings.length > 0 && !allCriticalAcknowledged) {
      toast({
        title: "Safety Check Required",
        description: "Please acknowledge all safety warnings before proceeding",
        variant: "destructive",
      });
      return;
    }

    if (formData.requires_justification && !formData.justification.trim()) {
      toast({
        title: "Justification Required",
        description: "Please provide justification for this restricted antibiotic",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: formData.patient_id,
          infection_site: formData.infection_site as InfectionSite,
          clinical_setting: formData.clinical_setting as ClinicalSetting,
          antibiotic_name: formData.antibiotic_name,
          antibiotic_class: formData.antibiotic_class || null,
          dose: formData.dose,
          route: formData.route,
          frequency: formData.frequency,
          duration_days: formData.duration_days,
          start_date: formData.start_date,
          end_date: new Date(new Date(formData.start_date).getTime() + formData.duration_days * 24 * 60 * 60 * 1000).toISOString(),
          is_broad_spectrum: formData.is_broad_spectrum,
          is_restricted: formData.is_restricted,
          requires_justification: formData.requires_justification,
          justification: formData.justification || null,
          culture_based_decision: formData.culture_based_decision === "empiric" ? null : (formData.culture_based_decision === "culture_guided" ? "continue" : formData.culture_based_decision === "de_escalation" ? "de_escalate" : null),
          culture_decision_notes: formData.culture_decision_notes || null,
          lab_report_id: formData.lab_report_id || null,
          warnings_acknowledged: acknowledgedWarnings,
          prescribed_by: user.id,
          status: formData.is_restricted ? "pending" : "approved",
        })
        .select()
        .single();

      if (error) throw error;

      // Notify admins if restricted antibiotic
      if (formData.is_restricted && data) {
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        
        const adminIds = adminRoles?.map((r) => r.user_id) || [];
        const patientName = selectedPatient?.full_name || "Unknown";
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        
        await notifyRestrictedPrescription(
          adminIds,
          profile?.full_name || "A doctor",
          formData.antibiotic_name,
          data.id,
          patientName
        );
      }

      toast({
        title: formData.is_restricted ? "Prescription submitted for review" : "Prescription created",
        description: formData.is_restricted 
          ? "This prescription requires stewardship approval."
          : "Antibiotic therapy has been prescribed successfully.",
      });

      navigate(`/patients/${formData.patient_id}`);
    } catch (error: any) {
      console.error("Error creating prescription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const infectionSites: { value: InfectionSite; label: string }[] = [
    { value: "rti", label: "Respiratory Tract Infection" },
    { value: "uti", label: "Urinary Tract Infection" },
    { value: "ssti", label: "Skin & Soft Tissue Infection" },
    { value: "iai", label: "Intra-Abdominal Infection" },
    { value: "cns", label: "Central Nervous System" },
    { value: "bsi", label: "Bloodstream Infection" },
  ];

  const clinicalSettings: { value: ClinicalSetting; label: string }[] = [
    { value: "opd", label: "Outpatient (OPD)" },
    { value: "ipd", label: "Inpatient (IPD)" },
    { value: "icu", label: "Intensive Care Unit (ICU)" },
  ];

  const routes = [
    { value: "iv", label: "IV" },
    { value: "im", label: "IM" },
    { value: "oral", label: "PO (Oral)" },
    { value: "topical", label: "Topical" },
  ];

  const frequencies = [
    "Once daily",
    "Twice daily (BD)",
    "Three times daily (TDS)",
    "Four times daily (QID)",
    "Every 6 hours",
    "Every 8 hours",
    "Every 12 hours",
    "Stat dose",
  ];

  const typeLabels: Record<string, { label: string; className: string }> = {
    type_1: { label: "Type 1 - Low Risk", className: "bg-risk-low text-white" },
    type_2: { label: "Type 2 - Moderate", className: "bg-risk-moderate text-black" },
    type_3: { label: "Type 3 - High Risk", className: "bg-risk-high text-white" },
    type_4: { label: "Type 4 - Critical", className: "bg-risk-critical text-white" },
  };

  if (userRole !== "doctor") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <ShieldAlert className="w-12 h-12 text-destructive/50 mb-4" />
        <p className="text-muted-foreground">Only doctors can prescribe antibiotics</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            New Prescription
          </h1>
          <p className="text-muted-foreground mt-1">
            Antibiotic decision support with safety checks
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value, lab_report_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No active patients</div>
                  ) : (
                    patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.full_name} ({patient.patient_id || "No ID"}) - {patient.age}y {patient.gender}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            {selectedPatient && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedPatient.full_name}</span>
                    <Badge className={typeLabels[selectedPatient.patient_type || "type_1"].className}>
                      {typeLabels[selectedPatient.patient_type || "type_1"].label}
                    </Badge>
                    {selectedPatient.has_septic_shock && (
                      <Badge variant="destructive">Septic Shock</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedPatient.ward} / Bed {selectedPatient.bed_number || "-"}
                  </span>
                </div>
                {selectedPatient.known_allergies && selectedPatient.known_allergies.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive font-medium">Allergies:</span>
                    {selectedPatient.known_allergies.map((allergy, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                )}
                {selectedPatient.renal_function && selectedPatient.renal_function !== "normal" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="w-4 h-4 text-warning" />
                    <span className="text-warning">Renal: {selectedPatient.renal_function}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Infection & Setting */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Infection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Infection Site *</Label>
                <Select
                  value={formData.infection_site}
                  onValueChange={(value) => setFormData({ ...formData, infection_site: value as InfectionSite })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select infection site" />
                  </SelectTrigger>
                  <SelectContent>
                    {infectionSites.map((site) => (
                      <SelectItem key={site.value} value={site.value}>
                        {site.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Clinical Setting *</Label>
                <Select
                  value={formData.clinical_setting}
                  onValueChange={(value) => setFormData({ ...formData, clinical_setting: value as ClinicalSetting })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select clinical setting" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicalSettings.map((setting) => (
                      <SelectItem key={setting.value} value={setting.value}>
                        {setting.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Culture-based decision */}
            <div className="space-y-2">
              <Label>Treatment Approach</Label>
              <Select
                value={formData.culture_based_decision}
                onValueChange={(value: any) => setFormData({ ...formData, culture_based_decision: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empiric">Empiric Therapy</SelectItem>
                  <SelectItem value="culture_guided">Culture-Guided</SelectItem>
                  <SelectItem value="de_escalation">De-escalation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lab Report Selection */}
            {patientLabReports.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Lab Report (optional)</Label>
                <Select
                  value={formData.lab_report_id || "none"}
                  onValueChange={(value) => {
                    const actualValue = value === "none" ? "" : value;
                    setFormData({ ...formData, lab_report_id: actualValue });
                    const report = patientLabReports.find((r) => r.id === actualValue);
                    setSelectedLabReport(report || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select culture report" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {patientLabReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.report_type} - {report.specimen_type} ({new Date(report.created_at).toLocaleDateString()})
                        {report.is_mdr && " [MDR]"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Antibiotic Recommendations */}
        {recommendedAntibiotics.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Recommended Antibiotics
              </CardTitle>
              <CardDescription>
                Based on guidelines for {infectionSites.find((s) => s.value === formData.infection_site)?.label} in {clinicalSettings.find((s) => s.value === formData.clinical_setting)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendedAntibiotics.map((option, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.antibiotic_name === option.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => selectAntibiotic(option)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{option.name}</p>
                        {option.dose && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {option.dose} {option.route} {option.frequency}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {option.isFirstLine && (
                          <Badge variant="default" className="text-xs">1st Line</Badge>
                        )}
                        {option.source === "culture" && (
                          <Badge variant="secondary" className="text-xs bg-success/20 text-success">
                            Sensitive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Antibiotic Entry */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Prescription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Antibiotic Name *</Label>
                <Input
                  value={formData.antibiotic_name}
                  onChange={(e) => setFormData({ ...formData, antibiotic_name: e.target.value })}
                  placeholder="e.g., Amoxicillin-Clavulanate"
                />
              </div>
              <div className="space-y-2">
                <Label>Antibiotic Class</Label>
                <Input
                  value={formData.antibiotic_class}
                  onChange={(e) => setFormData({ ...formData, antibiotic_class: e.target.value })}
                  placeholder="e.g., Beta-lactam"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Dose *</Label>
                <Input
                  value={formData.dose}
                  onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                  placeholder="e.g., 1.2g"
                />
              </div>
              <div className="space-y-2">
                <Label>Route *</Label>
                <Select
                  value={formData.route}
                  onValueChange={(value) => setFormData({ ...formData, route: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.value} value={route.value}>
                        {route.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {freq}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 7 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Warnings */}
        {safetyWarnings.length > 0 && (
          <Card className="border-warning/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-warning">
                <ShieldAlert className="w-5 h-5" />
                Safety Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {safetyWarnings.map((warning, i) => (
                <Alert
                  key={i}
                  variant={warning.severity === "error" ? "destructive" : "default"}
                  className={warning.severity === "warning" ? "border-warning bg-warning/10" : ""}
                >
                  {warning.severity === "error" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : warning.severity === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertTitle className="capitalize">{warning.type}</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{warning.message}</span>
                    {warning.requiresAcknowledgment && (
                      <div className="flex items-center gap-2 ml-4">
                        <Checkbox
                          id={`warning-${i}`}
                          checked={acknowledgedWarnings.includes(warning.message)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAcknowledgedWarnings([...acknowledgedWarnings, warning.message]);
                            } else {
                              setAcknowledgedWarnings(
                                acknowledgedWarnings.filter((w) => w !== warning.message)
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`warning-${i}`} className="text-xs cursor-pointer">
                          Acknowledge
                        </Label>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Justification for restricted antibiotics */}
        {formData.requires_justification && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Justification Required
              </CardTitle>
              <CardDescription>
                This antibiotic is restricted. Provide clinical justification for stewardship review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                placeholder="Provide clinical justification for using this restricted antibiotic..."
                rows={4}
              />
            </CardContent>
          </Card>
        )}

        {/* Culture Decision Notes */}
        {formData.culture_based_decision !== "empiric" && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Culture Decision Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.culture_decision_notes}
                onChange={(e) => setFormData({ ...formData, culture_decision_notes: e.target.value })}
                placeholder="Document the rationale for culture-guided therapy or de-escalation..."
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="gradient-primary"
            disabled={
              loading ||
              !formData.patient_id ||
              !formData.antibiotic_name ||
              !formData.dose ||
              !formData.frequency ||
              (criticalWarnings.length > 0 && !allCriticalAcknowledged)
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : formData.is_restricted ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit for Review
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create Prescription
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
