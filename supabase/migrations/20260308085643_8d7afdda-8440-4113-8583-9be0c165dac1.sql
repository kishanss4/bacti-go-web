
-- Add medical history fields to patients table
ALTER TABLE public.patients
  ADD COLUMN medical_history_file_url text,
  ADD COLUMN medical_history_file_name text,
  ADD COLUMN medical_history_summary text;

-- Create a dedicated storage bucket for medical history documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-history', 'medical-history', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medical-history bucket
CREATE POLICY "Clinical staff can upload medical history"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-history'
  AND (SELECT public.is_clinical_staff(auth.uid()))
);

CREATE POLICY "Clinical staff can view medical history"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-history'
  AND (SELECT public.is_clinical_staff(auth.uid()))
);

CREATE POLICY "Clinical staff can delete medical history"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-history'
  AND (SELECT public.is_clinical_staff(auth.uid()))
);
