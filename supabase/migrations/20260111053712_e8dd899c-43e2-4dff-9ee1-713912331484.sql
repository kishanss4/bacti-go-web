-- =============================================
-- BACTI-GO Database Schema
-- =============================================

-- 1. Create app role enum
CREATE TYPE public.app_role AS ENUM ('doctor', 'nurse', 'admin');

-- 2. Create patient type enum (risk stratification)
CREATE TYPE public.patient_type AS ENUM ('type_1', 'type_2', 'type_3', 'type_4');

-- 3. Create infection site enum
CREATE TYPE public.infection_site AS ENUM ('uti', 'bsi', 'rti', 'ssti', 'cns', 'iai');

-- 4. Create clinical setting enum
CREATE TYPE public.clinical_setting AS ENUM ('icu', 'ipd', 'opd');

-- 5. Create prescription status enum
CREATE TYPE public.prescription_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- 6. Create renal function enum
CREATE TYPE public.renal_function AS ENUM ('normal', 'impaired');

-- =============================================
-- USER PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES TABLE (Security critical - separate from profiles)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'nurse',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_doctor UUID REFERENCES auth.users(id),
  
  -- Demographics
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  weight DECIMAL(5,2),
  
  -- Contact & ID
  patient_id TEXT UNIQUE,
  phone TEXT,
  ward TEXT,
  bed_number TEXT,
  
  -- Clinical data for risk stratification
  renal_function renal_function DEFAULT 'normal',
  known_allergies TEXT[],
  comorbidities TEXT[],
  
  -- Risk factors for patient type classification
  is_community_acquired BOOLEAN DEFAULT true,
  has_prior_antibiotics_90_days BOOLEAN DEFAULT false,
  has_healthcare_contact BOOLEAN DEFAULT false,
  is_elderly BOOLEAN DEFAULT false,
  hospitalized_days INTEGER DEFAULT 0,
  has_invasive_procedures BOOLEAN DEFAULT false,
  is_immunocompromised BOOLEAN DEFAULT false,
  has_persistent_fever BOOLEAN DEFAULT false,
  has_septic_shock BOOLEAN DEFAULT false,
  
  -- Calculated patient type (can be overridden by doctor)
  patient_type patient_type DEFAULT 'type_1',
  patient_type_override BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'deceased')),
  admission_date TIMESTAMPTZ DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- =============================================
-- LAB REPORTS TABLE
-- =============================================
CREATE TABLE public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN ('culture_sensitivity', 'blood_test', 'urine_test', 'other')),
  specimen_type TEXT,
  specimen_date TIMESTAMPTZ,
  
  -- File storage
  file_url TEXT,
  file_name TEXT,
  
  -- OCR extracted data
  ocr_text TEXT,
  ocr_processed BOOLEAN DEFAULT false,
  
  -- Extracted organisms and sensitivities
  organisms JSONB DEFAULT '[]',
  sensitivities JSONB DEFAULT '[]',
  
  -- MDR detection
  is_mdr BOOLEAN DEFAULT false,
  mdr_type TEXT[], -- e.g., ['MRSA', 'ESBL', 'CRE']
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'confirmed')),
  doctor_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ANTIBIOTIC GUIDELINES TABLE
-- =============================================
CREATE TABLE public.antibiotic_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  infection_site infection_site NOT NULL,
  patient_type patient_type NOT NULL,
  clinical_setting clinical_setting NOT NULL,
  is_pediatric BOOLEAN DEFAULT false,
  
  -- Recommendations
  first_line_antibiotics JSONB NOT NULL DEFAULT '[]',
  alternative_antibiotics JSONB DEFAULT '[]',
  
  -- Dosing and duration
  dosing_notes TEXT,
  duration_days_min INTEGER,
  duration_days_max INTEGER,
  
  -- Special considerations
  contraindications TEXT[],
  warnings TEXT[],
  
  -- For MDR pathogens
  mdr_pathogen TEXT, -- e.g., 'MRSA', 'VRE', 'ESBL', 'CRE'
  mdr_recommendations JSONB DEFAULT '[]',
  
  -- Metadata
  source TEXT DEFAULT 'Hospital Antibiotic Policy 2025',
  last_updated TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique combinations
  UNIQUE (infection_site, patient_type, clinical_setting, is_pediatric, mdr_pathogen)
);

ALTER TABLE public.antibiotic_guidelines ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PRESCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  lab_report_id UUID REFERENCES public.lab_reports(id),
  guideline_id UUID REFERENCES public.antibiotic_guidelines(id),
  
  -- Prescriber info
  prescribed_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Prescription details
  infection_site infection_site NOT NULL,
  clinical_setting clinical_setting NOT NULL,
  
  -- Antibiotic details
  antibiotic_name TEXT NOT NULL,
  antibiotic_class TEXT,
  route TEXT NOT NULL CHECK (route IN ('oral', 'iv', 'im', 'topical')),
  dose TEXT NOT NULL,
  frequency TEXT NOT NULL,
  
  -- Duration
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  duration_days INTEGER,
  
  -- Stewardship flags
  is_restricted BOOLEAN DEFAULT false,
  is_broad_spectrum BOOLEAN DEFAULT false,
  requires_justification BOOLEAN DEFAULT false,
  justification TEXT,
  
  -- Warnings triggered
  warnings_acknowledged JSONB DEFAULT '[]',
  
  -- Post-culture decisions
  culture_based_decision TEXT CHECK (culture_based_decision IN ('continue', 'de_escalate', 'escalate')),
  culture_decision_notes TEXT,
  
  -- Status
  status prescription_status DEFAULT 'pending',
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUDIT LOG TABLE (for compliance)
-- =============================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS (to avoid RLS recursion)
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is a doctor
CREATE OR REPLACE FUNCTION public.is_doctor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'doctor')
$$;

-- Function to check if user is a nurse
CREATE OR REPLACE FUNCTION public.is_nurse(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'nurse')
$$;

-- Function to check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if user is clinical staff (doctor or nurse)
CREATE OR REPLACE FUNCTION public.is_clinical_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('doctor', 'nurse')
  )
$$;

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  
  -- Assign default role as nurse (can be upgraded by admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'nurse');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_reports_updated_at
  BEFORE UPDATE ON public.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Clinical staff can view colleague profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_clinical_staff(auth.uid()));

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- PATIENTS POLICIES
CREATE POLICY "Clinical staff can view all patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (public.is_clinical_staff(auth.uid()));

CREATE POLICY "Clinical staff can create patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_clinical_staff(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Doctors can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (public.is_doctor(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Admins can delete patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- LAB REPORTS POLICIES
CREATE POLICY "Clinical staff can view lab reports"
  ON public.lab_reports FOR SELECT
  TO authenticated
  USING (public.is_clinical_staff(auth.uid()));

CREATE POLICY "Clinical staff can upload lab reports"
  ON public.lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_clinical_staff(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Doctors can review lab reports"
  ON public.lab_reports FOR UPDATE
  TO authenticated
  USING (public.is_doctor(auth.uid()));

CREATE POLICY "Admins can delete lab reports"
  ON public.lab_reports FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ANTIBIOTIC GUIDELINES POLICIES (read-only for clinical staff)
CREATE POLICY "Anyone can view guidelines"
  ON public.antibiotic_guidelines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage guidelines"
  ON public.antibiotic_guidelines FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- PRESCRIPTIONS POLICIES
CREATE POLICY "Clinical staff can view prescriptions"
  ON public.prescriptions FOR SELECT
  TO authenticated
  USING (public.is_clinical_staff(auth.uid()));

CREATE POLICY "Doctors can create prescriptions"
  ON public.prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_doctor(auth.uid()) AND prescribed_by = auth.uid());

CREATE POLICY "Doctors can update prescriptions"
  ON public.prescriptions FOR UPDATE
  TO authenticated
  USING (public.is_doctor(auth.uid()));

CREATE POLICY "Admins can delete prescriptions"
  ON public.prescriptions FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- AUDIT LOG POLICIES
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_patients_created_by ON public.patients(created_by);
CREATE INDEX idx_patients_assigned_doctor ON public.patients(assigned_doctor);
CREATE INDEX idx_patients_status ON public.patients(status);
CREATE INDEX idx_patients_patient_type ON public.patients(patient_type);

CREATE INDEX idx_lab_reports_patient_id ON public.lab_reports(patient_id);
CREATE INDEX idx_lab_reports_status ON public.lab_reports(status);

CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_prescribed_by ON public.prescriptions(prescribed_by);
CREATE INDEX idx_prescriptions_status ON public.prescriptions(status);

CREATE INDEX idx_antibiotic_guidelines_lookup ON public.antibiotic_guidelines(infection_site, patient_type, clinical_setting);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);