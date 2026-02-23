-- Create storage bucket for lab report files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-reports',
  'lab-reports',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for lab-reports bucket
CREATE POLICY "Clinical staff can upload lab report files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab-reports' 
  AND (SELECT is_clinical_staff(auth.uid()))
);

CREATE POLICY "Clinical staff can view lab report files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lab-reports' 
  AND (SELECT is_clinical_staff(auth.uid()))
);

CREATE POLICY "Admins can delete lab report files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab-reports' 
  AND (SELECT is_admin(auth.uid()))
);