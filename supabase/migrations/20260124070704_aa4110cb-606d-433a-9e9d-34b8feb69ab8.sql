-- Assign admin role to the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('ce93ac63-81ef-4dce-a5d9-0eed9d8cade3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;