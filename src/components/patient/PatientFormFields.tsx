import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  AlertTriangle,
  Stethoscope,
  AlertCircle,
  Info,
} from "lucide-react";
import type { PatientFormData } from "@/hooks/usePatientForm";
import type { Database } from "@/integrations/supabase/types";

type RenalFunction = Database["public"]["Enums"]["renal_function"];

interface PatientFormFieldsProps {
  formData: PatientFormData;
  onChange: <K extends keyof PatientFormData>(field: K, value: PatientFormData[K]) => void;
  onRiskFactorChange: (field: string, value: boolean | number) => void;
}

export function PatientFormFields({
  formData,
  onChange,
  onRiskFactorChange,
}: PatientFormFieldsProps) {
  return (
    <>
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
                onChange={(e) => onChange("full_name", e.target.value)}
                placeholder="Patient full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient ID</Label>
              <Input
                id="patient_id"
                value={formData.patient_id}
                onChange={(e) => onChange("patient_id", e.target.value)}
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
                onChange={(e) => onChange("age", e.target.value)}
                placeholder="Age"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => onChange("gender", value)}
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
                onChange={(e) => onChange("weight", e.target.value)}
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
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="Contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Input
                id="ward"
                value={formData.ward}
                onChange={(e) => onChange("ward", e.target.value)}
                placeholder="Ward name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bed_number">Bed Number</Label>
              <Input
                id="bed_number"
                value={formData.bed_number}
                onChange={(e) => onChange("bed_number", e.target.value)}
                placeholder="Bed #"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="renal_function">Renal Function</Label>
            <Select
              value={formData.renal_function}
              onValueChange={(value) => onChange("renal_function", value as RenalFunction)}
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
              onChange={(e) => onChange("known_allergies", e.target.value)}
              placeholder="Comma-separated list (e.g., Penicillin, Sulfa drugs)"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comorbidities">Comorbidities</Label>
            <Textarea
              id="comorbidities"
              value={formData.comorbidities}
              onChange={(e) => onChange("comorbidities", e.target.value)}
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
                  onRiskFactorChange("is_community_acquired", checked)
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
                  onRiskFactorChange("has_healthcare_contact", checked)
                }
              />
            </div>
          </div>

          <Separator />

          {/* Antibiotic History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Prior Antibiotic Use (90 days)</Label>
                <p className="text-xs text-muted-foreground">
                  Any antibiotic treatment in past 3 months
                </p>
              </div>
              <Switch
                checked={formData.has_prior_antibiotics_90_days}
                onCheckedChange={(checked) =>
                  onRiskFactorChange("has_prior_antibiotics_90_days", checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospitalized_days">Days Hospitalized (current)</Label>
              <Input
                id="hospitalized_days"
                type="number"
                min="0"
                value={formData.hospitalized_days}
                onChange={(e) =>
                  onRiskFactorChange("hospitalized_days", parseInt(e.target.value) || 0)
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                ≥5 days indicates hospital-acquired risk
              </p>
            </div>
          </div>

          <Separator />

          {/* Clinical Factors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Invasive Procedures</Label>
                <p className="text-xs text-muted-foreground">
                  Catheter, ventilator, central line, surgery
                </p>
              </div>
              <Switch
                checked={formData.has_invasive_procedures}
                onCheckedChange={(checked) =>
                  onRiskFactorChange("has_invasive_procedures", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Immunocompromised</Label>
                <p className="text-xs text-muted-foreground">
                  Chemotherapy, steroids, HIV, transplant recipient
                </p>
              </div>
              <Switch
                checked={formData.is_immunocompromised}
                onCheckedChange={(checked) =>
                  onRiskFactorChange("is_immunocompromised", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Persistent Fever</Label>
                <p className="text-xs text-muted-foreground">
                  Fever &gt;48 hours despite treatment
                </p>
              </div>
              <Switch
                checked={formData.has_persistent_fever}
                onCheckedChange={(checked) =>
                  onRiskFactorChange("has_persistent_fever", checked)
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
                <p className="text-xs text-destructive/80">
                  Requires vasopressors, MAP &lt;65 mmHg despite fluid resuscitation
                </p>
              </div>
              <Switch
                checked={formData.has_septic_shock}
                onCheckedChange={(checked) =>
                  onRiskFactorChange("has_septic_shock", checked)
                }
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Risk Stratification Guide</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Type 1:</strong> Low risk - Community-acquired, minimal factors</li>
                  <li><strong>Type 2:</strong> Moderate risk - Prior antibiotics or healthcare exposure</li>
                  <li><strong>Type 3:</strong> High risk - Hospital-acquired or immunocompromised</li>
                  <li><strong>Type 4:</strong> Critical - Septic shock or severe combination</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
