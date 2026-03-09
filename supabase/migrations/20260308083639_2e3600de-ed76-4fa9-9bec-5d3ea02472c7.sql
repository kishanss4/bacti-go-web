
-- Fix: include admin in is_clinical_staff so admins can view all clinical data
CREATE OR REPLACE FUNCTION public.is_clinical_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('doctor', 'nurse', 'admin')
  )
$$;

-- Also allow admins to update patients
DROP POLICY IF EXISTS "Doctors can update patients" ON public.patients;
CREATE POLICY "Doctors and admins can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (is_doctor(auth.uid()) OR is_admin(auth.uid()) OR (created_by = auth.uid()));

-- Allow admins to update prescriptions
DROP POLICY IF EXISTS "Doctors can update prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors and admins can update prescriptions"
ON public.prescriptions
FOR UPDATE
TO authenticated
USING (is_doctor(auth.uid()) OR is_admin(auth.uid()));

-- Allow admins to update/review lab reports
DROP POLICY IF EXISTS "Doctors can review lab reports" ON public.lab_reports;
CREATE POLICY "Doctors and admins can review lab reports"
ON public.lab_reports
FOR UPDATE
TO authenticated
USING (is_doctor(auth.uid()) OR is_admin(auth.uid()));
