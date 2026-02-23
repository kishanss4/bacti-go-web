import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UserPen,
  Loader2,
  ArrowLeft,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { usePatientForm, patientToFormData, typeLabels } from "@/hooks/usePatientForm";
import { PatientFormFields } from "@/components/patient/PatientFormFields";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);

  const {
    formData,
    setFormData,
    calculatedType,
    handleChange,
    handleRiskFactorChange,
    getUpdateData,
  } = usePatientForm();

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Patient not found",
          variant: "destructive",
        });
        navigate("/patients");
        return;
      }

      setPatient(data);
      setFormData(patientToFormData(data));
      setLoading(false);
    };

    fetchPatient();
  }, [id, navigate, toast, setFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSaving(true);

    try {
      const updateData = getUpdateData();

      const { error } = await supabase
        .from("patients")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Patient updated",
        description: `${formData.full_name} has been updated successfully.`,
      });

      navigate(`/patients/${id}`);
    } catch (error: any) {
      console.error("Error updating patient:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update patient",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only doctors or the creator can edit
  const canEdit = userRole === "doctor" || patient?.created_by === user?.id;

  if (!canEdit) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Card className="glass border-destructive/50">
          <CardContent className="p-6">
            <p className="text-destructive">You don't have permission to edit this patient.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/patients/${id}`)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPen className="w-6 h-6 text-primary" />
            Edit Patient
          </h1>
          <p className="text-muted-foreground mt-1">
            Update patient information for {patient?.full_name}
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

        {/* Form Fields */}
        <PatientFormFields
          formData={formData}
          onChange={handleChange}
          onRiskFactorChange={handleRiskFactorChange}
        />

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/patients/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
