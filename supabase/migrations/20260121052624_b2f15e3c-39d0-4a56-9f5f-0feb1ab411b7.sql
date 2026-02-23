-- Seed antibiotic guidelines with correct enum values
-- clinical_setting: icu, ipd, opd
-- infection_site: uti, bsi, rti, ssti, cns, iai

DELETE FROM public.antibiotic_guidelines;

-- UTI - OPD (outpatient), Type 1
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, source)
VALUES ('uti', 'opd', 'type_1',
  '[{"name": "Nitrofurantoin", "dose": "100mg", "frequency": "BD", "route": "PO", "class": "Nitrofurans"},
    {"name": "Trimethoprim", "dose": "200mg", "frequency": "BD", "route": "PO", "class": "Folate inhibitor"}]'::jsonb,
  '[{"name": "Fosfomycin", "dose": "3g", "frequency": "Single dose", "route": "PO", "class": "Phosphonic acid"}]'::jsonb,
  3, 5, 'Uncomplicated cystitis. Check local resistance patterns.', ARRAY['Avoid nitrofurantoin if eGFR <45'], 'Hospital Antibiotic Policy 2025');

-- UTI - IPD, Type 3
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, mdr_pathogen, mdr_recommendations, source)
VALUES ('uti', 'ipd', 'type_3',
  '[{"name": "Piperacillin-Tazobactam", "dose": "4.5g", "frequency": "TDS", "route": "IV", "class": "Beta-lactam"},
    {"name": "Ceftriaxone", "dose": "1g", "frequency": "OD", "route": "IV", "class": "Cephalosporin"}]'::jsonb,
  '[{"name": "Meropenem", "dose": "1g", "frequency": "TDS", "route": "IV", "class": "Carbapenem", "restricted": true}]'::jsonb,
  7, 14, 'Obtain cultures before starting. Adjust based on sensitivities.', ARRAY['ESBL prevalence high'], 'ESBL', '[{"pathogen": "ESBL", "recommendation": "Meropenem 1g TDS"}]'::jsonb, 'Hospital Antibiotic Policy 2025');

-- RTI - OPD, Type 1 (CAP mild)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, source)
VALUES ('rti', 'opd', 'type_1',
  '[{"name": "Amoxicillin", "dose": "500mg", "frequency": "TDS", "route": "PO", "class": "Beta-lactam"},
    {"name": "Doxycycline", "dose": "100mg", "frequency": "BD", "route": "PO", "class": "Tetracycline"}]'::jsonb,
  '[{"name": "Azithromycin", "dose": "500mg", "frequency": "OD", "route": "PO", "class": "Macrolide"}]'::jsonb,
  5, 7, 'Mild CAP. Add macrolide if atypical pathogens suspected.', ARRAY['Check penicillin allergy'], 'Hospital Antibiotic Policy 2025');

-- RTI - IPD, Type 2 (CAP moderate)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, source)
VALUES ('rti', 'ipd', 'type_2',
  '[{"name": "Amoxicillin-Clavulanate", "dose": "1.2g", "frequency": "TDS", "route": "IV", "class": "Beta-lactam"},
    {"name": "Clarithromycin", "dose": "500mg", "frequency": "BD", "route": "IV", "class": "Macrolide"}]'::jsonb,
  '[{"name": "Ceftriaxone", "dose": "1g", "frequency": "OD", "route": "IV", "class": "Cephalosporin"}]'::jsonb,
  7, 10, 'Moderate CAP. Dual therapy for atypical coverage.', 'Hospital Antibiotic Policy 2025');

-- RTI - ICU, Type 4 (Severe CAP/HAP)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, mdr_pathogen, mdr_recommendations, source)
VALUES ('rti', 'icu', 'type_4',
  '[{"name": "Piperacillin-Tazobactam", "dose": "4.5g", "frequency": "QDS", "route": "IV", "class": "Beta-lactam"},
    {"name": "Vancomycin", "dose": "15-20mg/kg", "frequency": "BD", "route": "IV", "class": "Glycopeptide", "restricted": true}]'::jsonb,
  '[{"name": "Meropenem", "dose": "1g", "frequency": "TDS", "route": "IV", "class": "Carbapenem", "restricted": true}]'::jsonb,
  7, 14, 'Severe CAP/VAP. De-escalate based on cultures.', ARRAY['MRSA coverage with vancomycin', 'Monitor vancomycin trough 15-20 mg/L'], 'MRSA', '[{"pathogen": "MRSA", "recommendation": "Vancomycin or Linezolid"}]'::jsonb, 'Hospital Antibiotic Policy 2025');

-- BSI - IPD, Type 2
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, source)
VALUES ('bsi', 'ipd', 'type_2',
  '[{"name": "Ceftriaxone", "dose": "2g", "frequency": "OD", "route": "IV", "class": "Cephalosporin"},
    {"name": "Gentamicin", "dose": "5mg/kg", "frequency": "OD", "route": "IV", "class": "Aminoglycoside"}]'::jsonb,
  '[{"name": "Piperacillin-Tazobactam", "dose": "4.5g", "frequency": "TDS", "route": "IV", "class": "Beta-lactam"}]'::jsonb,
  10, 14, 'Source control essential. De-escalate based on cultures.', ARRAY['Remove central lines if source suspected'], 'Hospital Antibiotic Policy 2025');

-- BSI - ICU, Type 4 (Septic shock)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, source)
VALUES ('bsi', 'icu', 'type_4',
  '[{"name": "Meropenem", "dose": "1g", "frequency": "TDS", "route": "IV", "class": "Carbapenem", "restricted": true},
    {"name": "Vancomycin", "dose": "25-30mg/kg loading", "frequency": "then 15-20mg/kg BD", "route": "IV", "class": "Glycopeptide", "restricted": true}]'::jsonb,
  '[{"name": "Ceftazidime-Avibactam", "dose": "2.5g", "frequency": "TDS", "route": "IV", "class": "Beta-lactam", "restricted": true}]'::jsonb,
  14, 28, 'Septic shock - give within 1 hour. Broad-spectrum empiric.', ARRAY['Loading dose critical in septic shock'], 'Hospital Antibiotic Policy 2025');

-- SSTI - OPD, Type 1 (Cellulitis)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, source)
VALUES ('ssti', 'opd', 'type_1',
  '[{"name": "Flucloxacillin", "dose": "500mg", "frequency": "QDS", "route": "PO", "class": "Beta-lactam"},
    {"name": "Cefalexin", "dose": "500mg", "frequency": "QDS", "route": "PO", "class": "Cephalosporin"}]'::jsonb,
  '[{"name": "Clindamycin", "dose": "300mg", "frequency": "QDS", "route": "PO", "class": "Lincosamide"}]'::jsonb,
  5, 10, 'Uncomplicated cellulitis. Mark borders and reassess at 48-72h.', 'Hospital Antibiotic Policy 2025');

-- SSTI - IPD, Type 3 (Complicated)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, mdr_pathogen, mdr_recommendations, source)
VALUES ('ssti', 'ipd', 'type_3',
  '[{"name": "Flucloxacillin", "dose": "2g", "frequency": "QDS", "route": "IV", "class": "Beta-lactam"},
    {"name": "Vancomycin", "dose": "15-20mg/kg", "frequency": "BD", "route": "IV", "class": "Glycopeptide", "restricted": true}]'::jsonb,
  '[{"name": "Linezolid", "dose": "600mg", "frequency": "BD", "route": "IV/PO", "class": "Oxazolidinone", "restricted": true}]'::jsonb,
  10, 14, 'Surgical debridement may be required.', ARRAY['Consider necrotizing fasciitis if rapid progression'], 'MRSA', '[{"pathogen": "MRSA", "recommendation": "Vancomycin or Linezolid"}]'::jsonb, 'Hospital Antibiotic Policy 2025');

-- IAI - IPD, Type 2
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, source)
VALUES ('iai', 'ipd', 'type_2',
  '[{"name": "Amoxicillin-Clavulanate", "dose": "1.2g", "frequency": "TDS", "route": "IV", "class": "Beta-lactam"},
    {"name": "Metronidazole", "dose": "500mg", "frequency": "TDS", "route": "IV", "class": "Nitroimidazole"}]'::jsonb,
  '[{"name": "Ertapenem", "dose": "1g", "frequency": "OD", "route": "IV", "class": "Carbapenem"}]'::jsonb,
  4, 7, 'Source control is key. Duration 4-7 days after adequate source control.', 'Hospital Antibiotic Policy 2025');

-- CNS - IPD, Type 3 (Meningitis)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, source)
VALUES ('cns', 'ipd', 'type_3',
  '[{"name": "Ceftriaxone", "dose": "2g", "frequency": "BD", "route": "IV", "class": "Cephalosporin"},
    {"name": "Dexamethasone", "dose": "10mg", "frequency": "QDS", "route": "IV", "class": "Corticosteroid"}]'::jsonb,
  '[{"name": "Meropenem", "dose": "2g", "frequency": "TDS", "route": "IV", "class": "Carbapenem", "restricted": true}]'::jsonb,
  10, 14, 'Give dexamethasone before or with first antibiotic dose.', ARRAY['Add ampicillin if age >50 or immunocompromised'], 'Hospital Antibiotic Policy 2025');

-- CNS - ICU, Type 4 (Post-surgical)
INSERT INTO public.antibiotic_guidelines (infection_site, clinical_setting, patient_type, first_line_antibiotics, alternative_antibiotics, duration_days_min, duration_days_max, dosing_notes, warnings, mdr_pathogen, mdr_recommendations, source)
VALUES ('cns', 'icu', 'type_4',
  '[{"name": "Meropenem", "dose": "2g", "frequency": "TDS", "route": "IV", "class": "Carbapenem", "restricted": true},
    {"name": "Vancomycin", "dose": "15-20mg/kg", "frequency": "BD", "route": "IV", "class": "Glycopeptide", "restricted": true}]'::jsonb,
  '[{"name": "Linezolid", "dose": "600mg", "frequency": "BD", "route": "IV", "class": "Oxazolidinone", "restricted": true}]'::jsonb,
  21, 28, 'Post-neurosurgical meningitis. Consider intrathecal therapy for MDR.', ARRAY['Neurosurgery consult required'], 'MRSA', '[{"pathogen": "MRSA", "recommendation": "Vancomycin + Rifampicin"}]'::jsonb, 'Hospital Antibiotic Policy 2025');