import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  User,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Stethoscope,
  AlertCircle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
type RenalFunction = Database["public"]["Enums"]["renal_function"];

export default function NewPatientPage() {
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [calculatedType, setCalculatedType] = useState<string>("type_1");

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    patient_id: "",
    age: "",
    gender: "male",
    phone: "",
    ward: "",
    bed_number: "",
    weight: "",
    renal_function: "normal" as RenalFunction,
    known_allergies: "",
    comorbidities: "",
    // Risk factors
    is_community_acquired: true,
    has_prior_antibiotics_90_days: false,
    is_elderly: false,
    has_healthcare_contact: false,
    hospitalized_days: 0,
    has_invasive_procedures: false,
    is_immunocompromised: false,
    has_persistent_fever: false,
    has_septic_shock: false,
  });

  // Calculate patient type based on risk factors
  const calculatePatientType = () => {
    const {
      is_community_acquired,
      has_prior_antibiotics_90_days,
      is_elderly,
      has_healthcare_contact,
      hospitalized_days,
      has_invasive_procedures,
      is_immunocompromised,
      has_persistent_fever,
      has_septic_shock,
    } = formData;

    // Type 4: Critical - Septic shock or multiple severe risk factors
    if (has_septic_shock) return "type_4";
    if (is_immunocompromised && has_persistent_fever) return "type_4";

    // Type 3: High Risk - Hospital-acquired, invasive procedures, or immunocompromised
    if (!is_community_acquired || hospitalized_days >= 5) return "type_3";
    if (has_invasive_procedures) return "type_3";
    if (is_immunocompromised) return "type_3";
    if (has_persistent_fever && has_prior_antibiotics_90_days) return "type_3";

    // Type 2: Moderate Risk - Some risk factors present
    if (has_prior_antibiotics_90_days) return "type_2";
    if (has_healthcare_contact) return "type_2";
    if (is_elderly && (has_persistent_fever || hospitalized_days > 0)) return "type_2";

    // Type 1: Low Risk - Community-acquired, no significant risk factors
    return "type_1";
  };

  // Update calculated type when risk factors change
  const handleRiskFactorChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Recalculate type
    const updatedFormData = { ...formData, [field]: value };
    const {
      is_community_acquired,
      has_prior_antibiotics_90_days,
      is_elderly,
      has_healthcare_contact,
      hospitalized_days,
      has_invasive_procedures,
      is_immunocompromised,
      has_persistent_fever,
      has_septic_shock,
    } = updatedFormData;

    let newType = "type_1";
    if (has_septic_shock) newType = "type_4";
    else if (is_immunocompromised && has_persistent_fever) newType = "type_4";
    else if (!is_community_acquired || hospitalized_days >= 5) newType = "type_3";
    else if (has_invasive_procedures) newType = "type_3";
    else if (is_immunocompromised) newType = "type_3";
    else if (has_persistent_fever && has_prior_antibiotics_90_days) newType = "type_3";
    else if (has_prior_antibiotics_90_days) newType = "type_2";
    else if (has_healthcare_contact) newType = "type_2";
    else if (is_elderly && (has_persistent_fever || hospitalized_days > 0)) newType = "type_2";

    setCalculatedType(newType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const patientType = calculatePatientType();

      const patientData: PatientInsert = {
        full_name: formData.full_name.trim(),
        patient_id: formData.patient_id.trim() || null,
        age: parseInt(formData.age),
        gender: formData.gender,
        phone: formData.phone.trim() || null,
        ward: formData.ward.trim() || null,
        bed_number: formData.bed_number.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        renal_function: formData.renal_function,
        known_allergies: formData.known_allergies
          ? formData.known_allergies.split(",").map((a) => a.trim())
          : null,
        comorbidities: formData.comorbidities
          ? formData.comorbidities.split(",").map((c) => c.trim())
          : null,
        is_community_acquired: formData.is_community_acquired,
        has_prior_antibiotics_90_days: formData.has_prior_antibiotics_90_days,
        is_elderly: parseInt(formData.age) >= 65,
        has_healthcare_contact: formData.has_healthcare_contact,
        hospitalized_days: formData.hospitalized_days,
        has_invasive_procedures: formData.has_invasive_procedures,
        is_immunocompromised: formData.is_immunocompromised,
        has_persistent_fever: formData.has_persistent_fever,
        has_septic_shock: formData.has_septic_shock,
        patient_type: patientType as any,
        created_by: user.id,
        status: "active",
      };

      const { data, error } = await supabase
        .from("patients")
        .insert(patientData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Patient created",
        description: `${formData.full_name} has been added successfully.`,
      });

      navigate(`/patients/${data.id}`);
    } catch (error: any) {
      console.error("Error creating patient:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create patient",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, { label: string; color: string; description: string }> = {
    type_1: {
      label: "Type 1 - Low Risk",
      color: "bg-risk-low",
      description: "Community-acquired infection, no significant risk factors",
    },
    type_2: {
      label: "Type 2 - Moderate Risk",
      color: "bg-risk-moderate",
      description: "Some risk factors present (prior antibiotics, healthcare contact)",
    },
    type_3: {
      label: "Type 3 - High Risk",
      color: "bg-risk-high",
      description: "Hospital-acquired, invasive procedures, or immunocompromised",
    },
    type_4: {
      label: "Type 4 - Critical",
      color: "bg-risk-critical",
      description: "Septic shock or multiple severe risk factors",
    },
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" />
            New Patient
          </h1>
          <p className="text-muted-foreground mt-1">
            Register a new patient case
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Type Preview */}
        <Card className={`border-2 ${typeLabels[calculatedType].color}/30`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${typeLabels[calculatedType].color}`} />
              <div>
                <p className="font-semibold text-foreground">
                  Calculated Risk: {typeLabels[calculatedType].label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {typeLabels[calculatedType].description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient Information
            </CardTitle>
            <CardDescription>Basic demographic and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Patient full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID</Label>
                <Input
                  id="patient_id"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  placeholder="Hospital ID (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age (years) *</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="150"
                  value={formData.age}
                  onChange={(e) => {
                    setFormData({ ...formData, age: e.target.value });
                    handleRiskFactorChange("is_elderly", parseInt(e.target.value) >= 65);
                  }}
                  placeholder="Age"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Weight"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ward">Ward</Label>
                <Input
                  id="ward"
                  value={formData.ward}
                  onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                  placeholder="Ward name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed_number">Bed Number</Label>
                <Input
                  id="bed_number"
                  value={formData.bed_number}
                  onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
                  placeholder="Bed #"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="renal_function">Renal Function</Label>
              <Select
                value={formData.renal_function}
                onValueChange={(value) =>
                  setFormData({ ...formData, renal_function: value as RenalFunction })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (eGFR ≥60)</SelectItem>
                  <SelectItem value="impaired">Impaired (eGFR &lt;60)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clinical History */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Clinical History
            </CardTitle>
            <CardDescription>Allergies and comorbidities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="known_allergies">Known Allergies</Label>
              <Textarea
                id="known_allergies"
                value={formData.known_allergies}
                onChange={(e) => setFormData({ ...formData, known_allergies: e.target.value })}
                placeholder="Comma-separated list (e.g., Penicillin, Sulfa drugs)"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comorbidities">Comorbidities</Label>
              <Textarea
                id="comorbidities"
                value={formData.comorbidities}
                onChange={(e) => setFormData({ ...formData, comorbidities: e.target.value })}
                placeholder="Comma-separated list (e.g., Diabetes, Hypertension, CKD)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Risk Factors */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Risk Factor Assessment
            </CardTitle>
            <CardDescription>
              These factors determine patient risk stratification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Infection Source */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Community-Acquired Infection</Label>
                  <p className="text-xs text-muted-foreground">
                    Infection acquired outside healthcare facility
                  </p>
                </div>
                <Switch
                  checked={formData.is_community_acquired}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("is_community_acquired", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Healthcare Contact (past 90 days)</Label>
                  <p className="text-xs text-muted-foreground">
                    Dialysis, nursing home, recent hospitalization
                  </p>
                </div>
                <Switch
                  checked={formData.has_healthcare_contact}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("has_healthcare_contact", checked)
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Antibiotic History */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Prior Antibiotics (past 90 days)</Label>
                  <p className="text-xs text-muted-foreground">
                    Received antibiotic therapy in the last 3 months
                  </p>
                </div>
                <Switch
                  checked={formData.has_prior_antibiotics_90_days}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("has_prior_antibiotics_90_days", checked)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospitalized_days">Days Hospitalized (current admission)</Label>
                <Input
                  id="hospitalized_days"
                  type="number"
                  min="0"
                  value={formData.hospitalized_days}
                  onChange={(e) =>
                    handleRiskFactorChange("hospitalized_days", parseInt(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="max-w-32"
                />
              </div>
            </div>

            <Separator />

            {/* Clinical Factors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Invasive Procedures</Label>
                  <p className="text-xs text-muted-foreground">
                    Central line, urinary catheter, mechanical ventilation
                  </p>
                </div>
                <Switch
                  checked={formData.has_invasive_procedures}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("has_invasive_procedures", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Immunocompromised</Label>
                  <p className="text-xs text-muted-foreground">
                    Chemotherapy, transplant, HIV, chronic steroids
                  </p>
                </div>
                <Switch
                  checked={formData.is_immunocompromised}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("is_immunocompromised", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Persistent Fever (&gt;48h on therapy)</Label>
                  <p className="text-xs text-muted-foreground">
                    Fever not responding to current treatment
                  </p>
                </div>
                <Switch
                  checked={formData.has_persistent_fever}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("has_persistent_fever", checked)
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Critical Status */}
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Septic Shock
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Hypotension requiring vasopressors despite fluid resuscitation
                  </p>
                </div>
                <Switch
                  checked={formData.has_septic_shock}
                  onCheckedChange={(checked) =>
                    handleRiskFactorChange("has_septic_shock", checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/patients")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" className="gradient-primary" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Patient
          </Button>
        </div>
      </form>
    </div>
  );
}
