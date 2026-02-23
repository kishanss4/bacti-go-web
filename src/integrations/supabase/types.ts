export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      antibiotic_guidelines: {
        Row: {
          alternative_antibiotics: Json | null
          clinical_setting: Database["public"]["Enums"]["clinical_setting"]
          contraindications: string[] | null
          created_at: string
          dosing_notes: string | null
          duration_days_max: number | null
          duration_days_min: number | null
          first_line_antibiotics: Json
          id: string
          infection_site: Database["public"]["Enums"]["infection_site"]
          is_pediatric: boolean | null
          last_updated: string | null
          mdr_pathogen: string | null
          mdr_recommendations: Json | null
          patient_type: Database["public"]["Enums"]["patient_type"]
          source: string | null
          warnings: string[] | null
        }
        Insert: {
          alternative_antibiotics?: Json | null
          clinical_setting: Database["public"]["Enums"]["clinical_setting"]
          contraindications?: string[] | null
          created_at?: string
          dosing_notes?: string | null
          duration_days_max?: number | null
          duration_days_min?: number | null
          first_line_antibiotics?: Json
          id?: string
          infection_site: Database["public"]["Enums"]["infection_site"]
          is_pediatric?: boolean | null
          last_updated?: string | null
          mdr_pathogen?: string | null
          mdr_recommendations?: Json | null
          patient_type: Database["public"]["Enums"]["patient_type"]
          source?: string | null
          warnings?: string[] | null
        }
        Update: {
          alternative_antibiotics?: Json | null
          clinical_setting?: Database["public"]["Enums"]["clinical_setting"]
          contraindications?: string[] | null
          created_at?: string
          dosing_notes?: string | null
          duration_days_max?: number | null
          duration_days_min?: number | null
          first_line_antibiotics?: Json
          id?: string
          infection_site?: Database["public"]["Enums"]["infection_site"]
          is_pediatric?: boolean | null
          last_updated?: string | null
          mdr_pathogen?: string | null
          mdr_recommendations?: Json | null
          patient_type?: Database["public"]["Enums"]["patient_type"]
          source?: string | null
          warnings?: string[] | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          created_at: string
          doctor_notes: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_mdr: boolean | null
          mdr_type: string[] | null
          ocr_processed: boolean | null
          ocr_text: string | null
          organisms: Json | null
          patient_id: string
          report_type: string
          reviewed_by: string | null
          sensitivities: Json | null
          specimen_date: string | null
          specimen_type: string | null
          status: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          doctor_notes?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_mdr?: boolean | null
          mdr_type?: string[] | null
          ocr_processed?: boolean | null
          ocr_text?: string | null
          organisms?: Json | null
          patient_id: string
          report_type: string
          reviewed_by?: string | null
          sensitivities?: Json | null
          specimen_date?: string | null
          specimen_type?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          doctor_notes?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_mdr?: boolean | null
          mdr_type?: string[] | null
          ocr_processed?: boolean | null
          ocr_text?: string | null
          organisms?: Json | null
          patient_id?: string
          report_type?: string
          reviewed_by?: string | null
          sensitivities?: Json | null
          specimen_date?: string | null
          specimen_type?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          admission_date: string | null
          age: number
          assigned_doctor: string | null
          bed_number: string | null
          comorbidities: string[] | null
          created_at: string
          created_by: string
          discharge_date: string | null
          full_name: string
          gender: string
          has_healthcare_contact: boolean | null
          has_invasive_procedures: boolean | null
          has_persistent_fever: boolean | null
          has_prior_antibiotics_90_days: boolean | null
          has_septic_shock: boolean | null
          hospitalized_days: number | null
          id: string
          is_community_acquired: boolean | null
          is_elderly: boolean | null
          is_immunocompromised: boolean | null
          known_allergies: string[] | null
          patient_id: string | null
          patient_type: Database["public"]["Enums"]["patient_type"] | null
          patient_type_override: boolean | null
          phone: string | null
          renal_function: Database["public"]["Enums"]["renal_function"] | null
          status: string | null
          updated_at: string
          ward: string | null
          weight: number | null
        }
        Insert: {
          admission_date?: string | null
          age: number
          assigned_doctor?: string | null
          bed_number?: string | null
          comorbidities?: string[] | null
          created_at?: string
          created_by: string
          discharge_date?: string | null
          full_name: string
          gender: string
          has_healthcare_contact?: boolean | null
          has_invasive_procedures?: boolean | null
          has_persistent_fever?: boolean | null
          has_prior_antibiotics_90_days?: boolean | null
          has_septic_shock?: boolean | null
          hospitalized_days?: number | null
          id?: string
          is_community_acquired?: boolean | null
          is_elderly?: boolean | null
          is_immunocompromised?: boolean | null
          known_allergies?: string[] | null
          patient_id?: string | null
          patient_type?: Database["public"]["Enums"]["patient_type"] | null
          patient_type_override?: boolean | null
          phone?: string | null
          renal_function?: Database["public"]["Enums"]["renal_function"] | null
          status?: string | null
          updated_at?: string
          ward?: string | null
          weight?: number | null
        }
        Update: {
          admission_date?: string | null
          age?: number
          assigned_doctor?: string | null
          bed_number?: string | null
          comorbidities?: string[] | null
          created_at?: string
          created_by?: string
          discharge_date?: string | null
          full_name?: string
          gender?: string
          has_healthcare_contact?: boolean | null
          has_invasive_procedures?: boolean | null
          has_persistent_fever?: boolean | null
          has_prior_antibiotics_90_days?: boolean | null
          has_septic_shock?: boolean | null
          hospitalized_days?: number | null
          id?: string
          is_community_acquired?: boolean | null
          is_elderly?: boolean | null
          is_immunocompromised?: boolean | null
          known_allergies?: string[] | null
          patient_id?: string | null
          patient_type?: Database["public"]["Enums"]["patient_type"] | null
          patient_type_override?: boolean | null
          phone?: string | null
          renal_function?: Database["public"]["Enums"]["renal_function"] | null
          status?: string | null
          updated_at?: string
          ward?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          antibiotic_class: string | null
          antibiotic_name: string
          approved_by: string | null
          clinical_setting: Database["public"]["Enums"]["clinical_setting"]
          created_at: string
          culture_based_decision: string | null
          culture_decision_notes: string | null
          dose: string
          duration_days: number | null
          end_date: string | null
          frequency: string
          guideline_id: string | null
          id: string
          infection_site: Database["public"]["Enums"]["infection_site"]
          is_broad_spectrum: boolean | null
          is_restricted: boolean | null
          justification: string | null
          lab_report_id: string | null
          patient_id: string
          prescribed_by: string
          rejection_reason: string | null
          requires_justification: boolean | null
          route: string
          start_date: string
          status: Database["public"]["Enums"]["prescription_status"] | null
          updated_at: string
          warnings_acknowledged: Json | null
        }
        Insert: {
          antibiotic_class?: string | null
          antibiotic_name: string
          approved_by?: string | null
          clinical_setting: Database["public"]["Enums"]["clinical_setting"]
          created_at?: string
          culture_based_decision?: string | null
          culture_decision_notes?: string | null
          dose: string
          duration_days?: number | null
          end_date?: string | null
          frequency: string
          guideline_id?: string | null
          id?: string
          infection_site: Database["public"]["Enums"]["infection_site"]
          is_broad_spectrum?: boolean | null
          is_restricted?: boolean | null
          justification?: string | null
          lab_report_id?: string | null
          patient_id: string
          prescribed_by: string
          rejection_reason?: string | null
          requires_justification?: boolean | null
          route: string
          start_date?: string
          status?: Database["public"]["Enums"]["prescription_status"] | null
          updated_at?: string
          warnings_acknowledged?: Json | null
        }
        Update: {
          antibiotic_class?: string | null
          antibiotic_name?: string
          approved_by?: string | null
          clinical_setting?: Database["public"]["Enums"]["clinical_setting"]
          created_at?: string
          culture_based_decision?: string | null
          culture_decision_notes?: string | null
          dose?: string
          duration_days?: number | null
          end_date?: string | null
          frequency?: string
          guideline_id?: string | null
          id?: string
          infection_site?: Database["public"]["Enums"]["infection_site"]
          is_broad_spectrum?: boolean | null
          is_restricted?: boolean | null
          justification?: string | null
          lab_report_id?: string | null
          patient_id?: string
          prescribed_by?: string
          rejection_reason?: string | null
          requires_justification?: boolean | null
          route?: string
          start_date?: string
          status?: Database["public"]["Enums"]["prescription_status"] | null
          updated_at?: string
          warnings_acknowledged?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_guideline_id_fkey"
            columns: ["guideline_id"]
            isOneToOne: false
            referencedRelation: "antibiotic_guidelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_lab_report_id_fkey"
            columns: ["lab_report_id"]
            isOneToOne: false
            referencedRelation: "lab_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_clinical_staff: { Args: { _user_id: string }; Returns: boolean }
      is_doctor: { Args: { _user_id: string }; Returns: boolean }
      is_nurse: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "doctor" | "nurse" | "admin"
      clinical_setting: "icu" | "ipd" | "opd"
      infection_site: "uti" | "bsi" | "rti" | "ssti" | "cns" | "iai"
      patient_type: "type_1" | "type_2" | "type_3" | "type_4"
      prescription_status: "pending" | "approved" | "rejected" | "completed"
      renal_function: "normal" | "impaired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["doctor", "nurse", "admin"],
      clinical_setting: ["icu", "ipd", "opd"],
      infection_site: ["uti", "bsi", "rti", "ssti", "cns", "iai"],
      patient_type: ["type_1", "type_2", "type_3", "type_4"],
      prescription_status: ["pending", "approved", "rejected", "completed"],
      renal_function: ["normal", "impaired"],
    },
  },
} as const
