
-- Prescriptions for all 12 patients with diverse combinations
-- Doctor: 4e04482c-dd3c-4507-9802-7eab873aff2a (Dr Kishan)
-- Routes: oral, iv, im, topical
-- Statuses: pending, approved, rejected, completed
-- Clinical settings: icu, ipd, opd
-- Infection sites: uti, bsi, rti, ssti, cns, iai

INSERT INTO prescriptions (patient_id, prescribed_by, antibiotic_name, antibiotic_class, dose, frequency, route, duration_days, start_date, end_date, clinical_setting, infection_site, status, is_broad_spectrum, is_restricted, requires_justification, justification, culture_based_decision, culture_decision_notes, approved_by) VALUES

-- BGSC-001 Priya Devi (Type 1, active) - Simple UTI, OPD, approved, oral
('ab05247a-375c-49e5-bf77-2d7021052680', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Nitrofurantoin', 'Nitrofurans', '100mg', 'BD', 'oral', 5, NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', 'opd', 'uti', 'approved', false, false, false, NULL, NULL, NULL, '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-002 Ramesh Gowda (Type 3, ICU) - BSI, IV, approved, broad spectrum, restricted
('3a991be5-7bfe-4e13-96b1-b00b6c2692f0', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Meropenem', 'Carbapenems', '1g', 'TDS', 'iv', 14, NOW() - INTERVAL '8 days', NOW() + INTERVAL '6 days', 'icu', 'bsi', 'approved', true, true, true, 'MDR Gram-negative bacteremia, failed empiric piperacillin-tazobactam. Culture confirmed carbapenem-sensitive Klebsiella.', 'escalate', 'Escalated from Piperacillin-Tazobactam after culture showed MDR Klebsiella', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-003 Lakshmi Narayan (Type 2, IPD) - RTI, oral, pending
('8539c2a2-6af1-40dd-98ec-76686cffc5c0', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Amoxicillin-Clavulanate', 'Penicillins', '625mg', 'TDS', 'oral', 7, NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 'ipd', 'rti', 'pending', false, false, false, NULL, NULL, NULL, NULL),

-- BGSC-004 Mohammed Irfan (Type 4, ICU, septic shock) - BSI, IV, approved, restricted + justification
('7c0ec9ce-40dd-4d0d-aefd-936ce62abd22', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Colistin', 'Polymyxins', '9MU loading then 4.5MU', 'BD', 'iv', 14, NOW() - INTERVAL '12 days', NOW() + INTERVAL '2 days', 'icu', 'bsi', 'approved', true, true, true, 'Pan-drug resistant Acinetobacter baumannii bacteremia with septic shock. Last resort antibiotic per MDR protocol.', 'escalate', 'All other options exhausted. Colistin-only sensitive organism.', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-004 Mohammed Irfan - Second prescription (antifungal, completed)
('7c0ec9ce-40dd-4d0d-aefd-936ce62abd22', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Fluconazole', 'Azoles', '400mg', 'OD', 'iv', 7, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', 'icu', 'bsi', 'completed', false, true, true, 'Candida albicans in blood culture. Empiric antifungal for immunocompromised septic patient.', 'continue', 'Culture confirmed Candida albicans sensitive to fluconazole', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-005 Sneha Patil (Type 1, OPD) - SSTI, oral, approved
('3a866a04-abbe-4463-a94c-2618b2c5c190', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Cephalexin', 'Cephalosporins', '500mg', 'QID', 'oral', 7, NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 'opd', 'ssti', 'approved', false, false, false, NULL, NULL, NULL, '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-006 Venkatesh Murthy (Type 2, discharged) - IAI, IV then oral, completed
('806c5b39-e331-4d68-9e67-7670a06de0e6', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Piperacillin-Tazobactam', 'Penicillins', '4.5g', 'TDS', 'iv', 10, NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', 'ipd', 'iai', 'completed', true, false, false, NULL, 'de_escalate', 'Culture showed E.coli sensitive to oral ciprofloxacin. Stepped down after 5 days IV.', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-007 Ananya Sharma (Type 1, pediatric) - RTI, oral, approved
('4d8a692c-34c4-4d90-b2c8-8f25f2bcee8c', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Amoxicillin', 'Penicillins', '250mg', 'TDS', 'oral', 5, NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', 'ipd', 'rti', 'approved', false, false, false, NULL, NULL, NULL, '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-008 Suresh Reddy (Type 3, ICU) - CNS infection, IV, approved, restricted
('95170a50-c8ae-4d8c-a4fb-75540c6114e8', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Vancomycin', 'Glycopeptides', '1g', 'BD', 'iv', 21, NOW() - INTERVAL '7 days', NOW() + INTERVAL '14 days', 'icu', 'cns', 'approved', false, true, true, 'MRSA meningitis in immunocompromised cancer patient. Vancomycin trough levels being monitored.', 'continue', 'CSF culture confirmed MRSA. Continuing vancomycin with dose adjustment for renal impairment.', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-009 Fatima Begum (Type 1, discharged) - UTI, oral, completed
('486fa732-8e69-4b7a-8dae-7a14a5e307a9', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Ciprofloxacin', 'Fluoroquinolones', '500mg', 'BD', 'oral', 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', 'ipd', 'uti', 'completed', false, false, false, NULL, 'continue', 'Urine culture confirmed E.coli sensitive to ciprofloxacin', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-010 Deepak Joshi (Type 4, ICU, septic shock) - BSI, IV, approved + rejected one
('d3511243-9b47-4a3c-a764-d83eb458259a', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Ceftazidime-Avibactam', 'Cephalosporins', '2.5g', 'TDS', 'iv', 14, NOW() - INTERVAL '10 days', NOW() + INTERVAL '4 days', 'icu', 'bsi', 'approved', true, true, true, 'CRE Klebsiella pneumoniae bacteremia with septic shock. Ceftazidime-avibactam per MDR protocol.', 'escalate', 'Escalated from meropenem after culture confirmed CRE.', '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-010 Deepak Joshi - Rejected prescription (was tried first)
('d3511243-9b47-4a3c-a764-d83eb458259a', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Meropenem', 'Carbapenems', '2g', 'TDS', 'iv', 7, NOW() - INTERVAL '15 days', NULL, 'icu', 'bsi', 'rejected', true, true, true, 'Empiric carbapenem for suspected gram-negative sepsis', NULL, NULL, NULL),

-- BGSC-011 Kavitha S (Type 1, OPD) - SSTI, topical + oral, pending
('41ce1076-cf50-4ad7-ab3e-49c5b3242026', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Mupirocin', 'Monoxycarbolic acid', '2% ointment', 'TDS', 'topical', 10, NOW(), NOW() + INTERVAL '10 days', 'opd', 'ssti', 'pending', false, false, false, NULL, NULL, NULL, NULL),

-- BGSC-011 Kavitha S - Second prescription, IM injection
('41ce1076-cf50-4ad7-ab3e-49c5b3242026', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Ceftriaxone', 'Cephalosporins', '1g', 'OD', 'im', 3, NOW(), NOW() + INTERVAL '3 days', 'opd', 'ssti', 'approved', false, false, false, NULL, NULL, NULL, '4e04482c-dd3c-4507-9802-7eab873aff2a'),

-- BGSC-012 Ravi Kumar B (Type 2, IPD) - IAI, IV, approved
('f7d7fb13-247c-487d-b157-2caa1655c793', '4e04482c-dd3c-4507-9802-7eab873aff2a', 'Metronidazole', 'Nitroimidazoles', '500mg', 'TDS', 'iv', 10, NOW() - INTERVAL '4 days', NOW() + INTERVAL '6 days', 'ipd', 'iai', 'approved', false, false, false, NULL, NULL, NULL, '4e04482c-dd3c-4507-9802-7eab873aff2a');
