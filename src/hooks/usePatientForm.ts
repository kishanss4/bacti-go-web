import { useState, useCallback, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type RenalFunction = Database["public"]["Enums"]["renal_function"];
type PatientType = Database["public"]["Enums"]["patient_type"];
type Patient = Database["public"]["Tables"]["patients"]["Row"];

export interface PatientFormData {
  full_name: string;
  patient_id: string;
  age: string;
  gender: string;
  phone: string;
  ward: string;
  bed_number: string;
  weight: string;
  renal_function: RenalFunction;
  known_allergies: string;
  comorbidities: string;
  // Risk factors
  is_community_acquired: boolean;
  has_prior_antibiotics_90_days: boolean;
  is_elderly: boolean;
  has_healthcare_contact: boolean;
  hospitalized_days: number;
  has_invasive_procedures: boolean;
  is_immunocompromised: boolean;
  has_persistent_fever: boolean;
  has_septic_shock: boolean;
}

export const initialFormData: PatientFormData = {
  full_name: "",
  patient_id: "",
  age: "",
  gender: "male",
  phone: "",
  ward: "",
  bed_number: "",
  weight: "",
  renal_function: "normal",
  known_allergies: "",
  comorbidities: "",
  is_community_acquired: true,
  has_prior_antibiotics_90_days: false,
  is_elderly: false,
  has_healthcare_contact: false,
  hospitalized_days: 0,
  has_invasive_procedures: false,
  is_immunocompromised: false,
  has_persistent_fever: false,
  has_septic_shock: false,
};

export const typeLabels: Record<string, { label: string; color: string; description: string }> = {
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

export function patientToFormData(patient: Patient): PatientFormData {
  return {
    full_name: patient.full_name || "",
    patient_id: patient.patient_id || "",
    age: patient.age?.toString() || "",
    gender: patient.gender || "male",
    phone: patient.phone || "",
    ward: patient.ward || "",
    bed_number: patient.bed_number || "",
    weight: patient.weight?.toString() || "",
    renal_function: patient.renal_function || "normal",
    known_allergies: patient.known_allergies?.join(", ") || "",
    comorbidities: patient.comorbidities?.join(", ") || "",
    is_community_acquired: patient.is_community_acquired ?? true,
    has_prior_antibiotics_90_days: patient.has_prior_antibiotics_90_days ?? false,
    is_elderly: patient.is_elderly ?? false,
    has_healthcare_contact: patient.has_healthcare_contact ?? false,
    hospitalized_days: patient.hospitalized_days ?? 0,
    has_invasive_procedures: patient.has_invasive_procedures ?? false,
    is_immunocompromised: patient.is_immunocompromised ?? false,
    has_persistent_fever: patient.has_persistent_fever ?? false,
    has_septic_shock: patient.has_septic_shock ?? false,
  };
}

export function usePatientForm(initialData: PatientFormData = initialFormData) {
  const [formData, setFormData] = useState<PatientFormData>(initialData);

  const calculatePatientType = useCallback((data: PatientFormData): PatientType => {
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
    } = data;

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
  }, []);

  const calculatedType = useMemo(() => calculatePatientType(formData), [formData, calculatePatientType]);

  const handleChange = useCallback(<K extends keyof PatientFormData>(
    field: K,
    value: PatientFormData[K]
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Auto-calculate is_elderly when age changes
      if (field === "age") {
        newData.is_elderly = parseInt(value as string) >= 65;
      }
      return newData;
    });
  }, []);

  const handleRiskFactorChange = useCallback((field: string, value: boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const setForm = useCallback((data: PatientFormData) => {
    setFormData(data);
  }, []);

  const getInsertData = useCallback((userId: string) => {
    return {
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
      patient_type: calculatedType,
      created_by: userId,
    };
  }, [formData, calculatedType]);

  const getUpdateData = useCallback(() => {
    return {
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
      patient_type: calculatedType,
    };
  }, [formData, calculatedType]);

  return {
    formData,
    setFormData: setForm,
    calculatedType,
    handleChange,
    handleRiskFactorChange,
    resetForm,
    getInsertData,
    getUpdateData,
    typeLabels,
  };
}
