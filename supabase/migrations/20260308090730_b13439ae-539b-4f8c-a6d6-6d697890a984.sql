
-- Table for multiple medical history documents per patient
CREATE TABLE public.medical_history_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  document_date date,
  document_type text DEFAULT 'general',
  summary text,
  ocr_text text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.medical_history_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view medical history docs"
  ON public.medical_history_documents FOR SELECT
  TO authenticated
  USING (is_clinical_staff(auth.uid()));

CREATE POLICY "Clinical staff can upload medical history docs"
  ON public.medical_history_documents FOR INSERT
  TO authenticated
  WITH CHECK (is_clinical_staff(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Doctors and admins can update medical history docs"
  ON public.medical_history_documents FOR UPDATE
  TO authenticated
  USING (is_doctor(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Doctors and admins can delete medical history docs"
  ON public.medical_history_documents FOR DELETE
  TO authenticated
  USING (is_doctor(auth.uid()) OR is_admin(auth.uid()));
