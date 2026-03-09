-- Allow doctors to also delete prescriptions
CREATE POLICY "Doctors can delete prescriptions"
ON public.prescriptions
FOR DELETE
TO authenticated
USING (is_doctor(auth.uid()));

-- Allow doctors to delete lab reports (currently only admins can)
CREATE POLICY "Doctors can delete lab reports"
ON public.lab_reports
FOR DELETE
TO authenticated
USING (is_doctor(auth.uid()));