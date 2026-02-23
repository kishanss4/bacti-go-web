-- Fix security warnings

-- 1. Add search_path to update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Replace permissive audit log INSERT policy with a more secure one
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

CREATE POLICY "Authenticated users can insert their own audit logs"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());