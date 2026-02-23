-- Fix: Remove automatic nurse role assignment
-- New users will have no role until an admin assigns one

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  
  -- DO NOT assign any role automatically
  -- Admin must manually approve and assign role (doctor/nurse/admin)
  -- This prevents unauthorized access to patient data
  
  RETURN NEW;
END;
$$;