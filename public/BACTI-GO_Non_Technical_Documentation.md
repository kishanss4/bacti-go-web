# BACTI-GO — System Documentation for Hospital Stakeholders

**Version:** 1.0  
**Date:** March 2026  
**Audience:** Hospital Administrators, Clinical Staff, Quality Assurance Teams, and Non-Technical Stakeholders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem BACTI-GO Addresses](#2-the-problem-bacti-go-addresses)
3. [System Overview](#3-system-overview)
4. [User Roles and Access](#4-user-roles-and-access)
5. [System Navigation and Layout](#5-system-navigation-and-layout)
6. [Dashboard](#6-dashboard)
7. [Patient Management](#7-patient-management)
8. [Lab Report Management](#8-lab-report-management)
9. [Prescription Workflow](#9-prescription-workflow)
10. [Antibiotic Guidelines Reference](#10-antibiotic-guidelines-reference)
11. [Administrative Capabilities](#11-administrative-capabilities)
12. [Stewardship Analytics](#12-stewardship-analytics)
13. [Profile Management](#13-profile-management)
14. [Notifications](#14-notifications)
15. [Safety and Governance Mechanisms](#15-safety-and-governance-mechanisms)
16. [Staff Accountability and Audit Trail](#16-staff-accountability-and-audit-trail)
17. [Data Export and Reporting](#17-data-export-and-reporting)
18. [Current System Capabilities Summary](#18-current-system-capabilities-summary)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

BACTI-GO is a mobile-first **Clinical Decision Support System (CDSS)** designed for hospital antibiotic stewardship. It helps doctors, nurses, and administrators ensure that antibiotics are prescribed appropriately — selecting the right drug, at the right dose, for the right duration — while reducing the risk of antimicrobial resistance (AMR).

The system is designed to be used at the point of care, particularly in Indian hospital settings, and aligns with institutional antibiotic guidelines such as those recommended by ICMR-AMR.

BACTI-GO is **not** a replacement for clinical judgment. It is a decision-support tool that provides real-time guidance, safety checks, and governance workflows to support responsible antibiotic prescribing.

---

## 2. The Problem BACTI-GO Addresses

### The Challenge

- **Antibiotic resistance** is a growing global health crisis, with India among the countries most affected by high rates of antibiotic consumption and multi-drug resistant (MDR) infections.
- Hospital antibiotic policies often exist as printed documents or PDFs that are difficult to access and consult during a busy clinical day.
- There is a lack of mobile-first, point-of-care tools that integrate stewardship guidelines with patient-specific clinical data.
- Tracking which antibiotics are prescribed, by whom, and whether stewardship protocols are followed requires significant manual effort.

### What BACTI-GO Solves

- Provides **instant access** to antibiotic guidelines filtered by infection site, clinical setting, and patient risk level.
- Automatically **flags safety risks** such as drug allergies, renal dose adjustments, and resistance patterns from culture reports.
- Enforces a **governance workflow** requiring clinical justification and administrative approval before restricted antibiotics (e.g., Carbapenems, Vancomycin) can be dispensed.
- Creates a complete **audit trail** showing who performed each clinical action, supporting accountability and quality assurance.
- Delivers **analytics and trend data** so hospital leadership can monitor stewardship outcomes over time.

---

## 3. System Overview

BACTI-GO operates as a web application accessible from any modern browser on phones, tablets, or desktops. It is optimised for mobile use, making it suitable for bedside decision-making.

### How Information Flows Through the System

1. **Patient Registration** — A staff member adds a patient with demographic details, ward information, risk factors, and medical history.
2. **Risk Classification** — The system automatically classifies the patient into one of four risk types (Type 1 through Type 4) based on clinical indicators.
3. **Lab Report Upload** — Culture and sensitivity reports are uploaded, optionally processed using OCR (optical character recognition) to extract text from scanned or photographed reports, and summarised using AI.
4. **Prescription Creation** — A doctor creates a prescription. The system cross-references antibiotic guidelines, patient allergies, renal function, and culture results to provide recommendations and safety warnings.
5. **Stewardship Review** — If the prescribed antibiotic is classified as restricted, the prescription is automatically held for administrative review and must be approved before it proceeds.
6. **Ongoing Monitoring** — Dashboards, activity feeds, and analytics track clinical actions across the hospital in real time.

---

## 4. User Roles and Access

BACTI-GO uses a role-based access model. Every user must be assigned a role by an administrator before they can access clinical features.

### 4.1 Doctor

- Can register new patients and edit patient records.
- Can upload lab reports.
- Can create antibiotic prescriptions using the decision-support engine.
- Can view and navigate all patient, lab report, and prescription records.
- Can delete lab reports and prescriptions.
- Receives safety warnings and must acknowledge them before proceeding with high-risk prescriptions.

### 4.2 Nurse

- Can register new patients and edit patient records.
- Can upload lab reports.
- Cannot create prescriptions (view-only access to prescriptions).
- Can view all patient and lab report records.
- Cannot delete lab reports or prescriptions.

### 4.3 Admin (Administrator)

- Has all the access privileges of a Doctor, including full visibility into patient records, lab reports, and prescriptions.
- Can delete lab reports and prescriptions.
- Can assign, change, or remove roles for all users in the system.
- Can review and approve or reject pending restricted antibiotic prescriptions.
- Has exclusive access to the **Analytics** dashboard and the **Admin Panel**.
- Can export data as CSV files for external reporting.

### 4.4 Users Without a Role

- A newly registered user who has not yet been assigned a role will see a warning indicator in the navigation panel.
- They cannot access clinical features until an administrator assigns them a role.

---

## 5. System Navigation and Layout

### Desktop View

- A **left sidebar** provides navigation to all major sections: Dashboard, Patients, New Patient, Lab Reports, Prescriptions, and Guidelines.
- Admin users see an additional "Administration" section with links to Analytics and the Admin Panel.
- The **top header** displays the logged-in user's name, email, a notification bell, and a sign-out button.

### Mobile View

- A **hamburger menu** in the top-left corner opens the full navigation panel.
- A **bottom navigation bar** provides quick access to the five most-used sections: Home (Dashboard), Patients, Reports, Prescriptions (Rx), and Profile.
- The interface is designed for one-handed use with safe area support for notched devices.

---

## 6. Dashboard

The Dashboard is the first screen users see after logging in. It provides a personalised clinical overview.

### 6.1 Statistics Summary

Four cards at the top of the dashboard display:

| Metric | Description |
|---|---|
| **Active Patients** | Number of patients currently marked as "active" in the system. |
| **Pending Reports** | Number of lab reports awaiting review. |
| **Critical Cases** | Number of active patients flagged with septic shock. |
| **Prescriptions Today** | Number of prescriptions created on the current day. |

### 6.2 Quick Actions

Buttons providing one-tap access to:

- Add a new patient
- View the patient list
- Open lab reports
- Open prescriptions

### 6.3 Physician Dashboard (Doctors Only)

Doctors see an additional section showing prescriptions that require their review.

### 6.4 Recent Activity Feed

A live feed of the 10 most recent clinical actions across the system, including:

- Patients added (with ward information)
- Lab reports uploaded (with patient name and specimen type)
- Prescriptions created (with antibiotic name and dose)

Each activity entry shows:
- **What happened** (e.g., "Patient added: Rajesh Kumar")
- **Who performed the action** (e.g., "Kishan (Nurse)")
- **When it happened** (e.g., "2h ago")

Clicking an activity entry navigates directly to the relevant record.

### 6.5 Clinical Reminder

A persistent reminder that BACTI-GO is a decision-support tool and that final clinical judgment rests with the treating physician.

---

## 7. Patient Management

### 7.1 Patient List

The Patients page displays all patients in a searchable table. Each row shows:

- Patient name, age, and gender
- Hospital patient ID
- Ward and bed number
- The staff member who added the patient (with their role)
- Risk classification (Type 1 through Type 4, colour-coded)
- Status (Active or Discharged)
- A critical-case warning icon for patients with septic shock

Users can search by patient name, hospital ID, or ward.

### 7.2 Adding a New Patient

The New Patient form collects the following information:

**Basic Information:**
- Full name, hospital patient ID, age, gender, phone number
- Ward, bed number, weight

**Clinical Details:**
- Renal function status (Normal or Impaired)
- Known drug allergies (comma-separated list)
- Comorbidities (comma-separated list)

**Risk Factors (used for automatic risk classification):**
- Community-acquired vs hospital-acquired infection
- Duration of hospitalisation (in days)
- Prior antibiotic use within 90 days
- Healthcare facility contact
- Immunocompromised status
- Invasive procedures
- Persistent fever
- Septic shock
- Elderly patient status

**Medical History:**
- An optional medical history document (image or PDF) can be uploaded.
- If uploaded, the system uses OCR and AI to extract and summarise the document's contents automatically.

### 7.3 Automatic Risk Classification

Based on the risk factors entered, the system automatically assigns the patient one of four types:

| Type | Risk Level | Criteria |
|---|---|---|
| **Type 1** | Low Risk | Community-acquired, no significant risk factors. |
| **Type 2** | Moderate | Some hospital-associated risk factors (e.g., prior antibiotics, healthcare contact). |
| **Type 3** | High Risk | Extended hospitalisation, immunocompromised, invasive procedures, or persistent fever. |
| **Type 4** | Critical | Septic shock present. |

This classification directly influences which antibiotic guidelines are recommended during prescription creation.

### 7.4 Patient Detail Page

Clicking on a patient opens their full record, which includes:

- All demographic and clinical details
- Associated lab reports
- Associated prescriptions
- Medical history summary (if available)
- Options to edit the patient record or add new lab reports and prescriptions linked to this patient

---

## 8. Lab Report Management

### 8.1 Lab Report List

The Lab Reports page displays all uploaded culture and sensitivity reports. Each row shows:

- Patient name and hospital ID
- Report type (e.g., Culture & Sensitivity)
- Specimen type (e.g., Blood, Urine, Sputum)
- Staff member who uploaded the report (with their role)
- Report status (Pending or Reviewed)
- MDR warning icon for multi-drug resistant organisms

Reports with an AI-generated medical summary can be expanded inline to preview the summary without opening the full report.

### 8.2 Uploading a New Lab Report

The upload form collects:

- **Patient selection** from the active patient list
- **Report type** (e.g., Culture & Sensitivity, Gram Stain, CBC)
- **Specimen type** (e.g., Blood, Urine, Sputum, Wound Swab)
- **Specimen date**
- **File upload** (image or PDF of the lab report)

**OCR and AI Processing:**
When an image or PDF file is uploaded:
1. The system performs OCR to extract text from the scanned report.
2. The extracted text is processed using AI to generate a structured medical summary.
3. This summary is stored alongside the report and displayed in the lab report detail view.

**Organism and Sensitivity Entry:**
Users can manually enter:
- Organism names detected in the culture
- Antibiotic sensitivity results for each organism (Sensitive, Resistant, or Intermediate)

**MDR Detection:**
- Users can flag whether the report indicates a multi-drug resistant organism.
- MDR type can be specified (e.g., MRSA, ESBL, CRE).

### 8.3 Lab Report Detail Page

The detail page shows the full report including:
- All entered metadata
- The uploaded file (viewable or downloadable)
- Organism and sensitivity data
- AI-generated medical summary
- Doctor's notes
- Option to mark the report as reviewed

### 8.4 Deletion

Doctors and Admins can permanently delete a lab report and its associated uploaded file. A confirmation dialog is shown before deletion.

---

## 9. Prescription Workflow

The prescription module is the core of BACTI-GO's clinical decision support. Only users with the **Doctor** role can create prescriptions.

### 9.1 Creating a Prescription

The prescription form follows a structured, guided workflow:

**Step 1: Select Patient**
- Choose from the list of active patients.
- Once selected, the patient's risk classification, allergies, renal function, and existing lab reports are loaded automatically.

**Step 2: Specify Clinical Context**
- Select the **infection site** (e.g., Urinary Tract, Bloodstream, Respiratory Tract, Skin & Soft Tissue, CNS, Intra-Abdominal).
- Select the **clinical setting** (Outpatient, Inpatient, or ICU).

**Step 3: Review Recommendations**
Based on the patient's risk type, infection site, and clinical setting, the system retrieves matching antibiotic guidelines and displays:
- **First-line antibiotic options** (recommended as the primary choice)
- **Alternative antibiotic options** (for cases where first-line options are not suitable)
- **Culture-guided options** (if a lab report with sensitivity data is linked, antibiotics the organism is sensitive to are highlighted)

**Step 4: Select Antibiotic and Dosing**
- Choose an antibiotic from the recommendations or enter one manually.
- Specify dose, route (IV, IM, Oral, Topical), frequency, and duration.
- Indicate whether the prescription is empiric, culture-guided, or a de-escalation.

**Step 5: Safety Checks (Automatic)**
The system automatically evaluates the prescription and may raise the following warnings:

| Warning Type | Description |
|---|---|
| **Allergy Alert** | The selected antibiotic matches or cross-reacts with a documented patient allergy. |
| **Renal Adjustment** | The patient has impaired renal function and the antibiotic requires dose adjustment. |
| **Restricted Antibiotic** | The selected antibiotic is on the restricted list and requires justification and administrative approval. |
| **Culture Resistance** | The patient's culture report shows resistance to the selected antibiotic. |
| **High-Risk Patient** | The patient is Type 3 or Type 4 and empiric therapy should be reviewed carefully. |

Critical safety warnings (allergy alerts, resistance flags) **must be acknowledged** by the prescriber before the prescription can be submitted.

**Step 6: Justification (If Required)**
If the antibiotic is classified as restricted (e.g., Meropenem, Vancomycin, Linezolid, Colistin, Tigecycline), the prescriber must provide a written clinical justification.

**Step 7: Submission**
- Non-restricted antibiotics are automatically approved upon submission.
- Restricted antibiotics are submitted with a **"Pending"** status and routed to the Admin Panel for stewardship review.

### 9.2 Prescription Statuses

| Status | Meaning |
|---|---|
| **Approved** | The prescription has been approved (automatically for non-restricted, or manually by an administrator for restricted antibiotics). |
| **Pending** | A restricted antibiotic prescription is awaiting administrative review. |
| **Rejected** | An administrator has rejected the prescription, with an optional reason provided. |
| **Completed** | The antibiotic course has been completed. |

### 9.3 Prescription List and Detail Pages

- The **Prescriptions** list page shows all prescriptions with patient name, antibiotic, dose, status, and prescriber.
- The **Prescription Detail** page shows the full prescription record, including safety warnings that were acknowledged, justification provided, and review history.
- Doctors and Admins can delete prescriptions.

---

## 10. Antibiotic Guidelines Reference

The Guidelines page provides a searchable, filterable reference of the hospital's antibiotic prescribing guidelines.

### Filters Available

- **Infection Site** — RTI, UTI, SSTI, IAI, CNS, BSI
- **Clinical Setting** — OPD, IPD, ICU
- **Patient Type** — Type 1 (Low Risk) through Type 4 (Critical)

### Information Displayed for Each Guideline

- First-line antibiotic options (with dose, route, and frequency where available)
- Alternative antibiotic options
- Recommended treatment duration (minimum and maximum days)
- Clinical warnings
- Dosing notes
- Contraindications
- Whether the guideline applies to paediatric patients

### Source Note

A note at the bottom reminds users that guidelines are based on hospital antibiotic policy and should always be verified against current institutional protocols.

---

## 11. Administrative Capabilities

The **Admin Panel** is accessible only to users with the Admin role and contains two main sections.

### 11.1 User Management

- View all registered users in a searchable table showing name, email, current role, department, and join date.
- **Assign a role** to any user (Doctor, Nurse, or Admin).
- **Change an existing role** for any user.
- **Remove a role** from any user (except the currently logged-in admin, to prevent self-lockout).
- **Export** the full user list as a CSV file.

### 11.2 Restricted Antibiotic Review

- View all prescriptions with a **Pending** status that require stewardship approval.
- For each pending prescription, see:
  - Antibiotic name and class
  - Patient name
  - Prescriber name
  - Dosing details (dose, route, frequency, duration)
  - Clinical indication (infection site and setting)
  - Whether the antibiotic is restricted or broad-spectrum
  - The prescriber's written justification
- **Approve** or **Reject** each prescription, with an optional reason for rejection.
- **Export** the pending reviews list as a CSV file.

---

## 12. Stewardship Analytics

The **Analytics** dashboard is accessible only to Admins and provides visual insights into antibiotic stewardship across the hospital.

### 12.1 Summary Statistics

- Total prescriptions
- Prescriptions pending review
- Approved prescriptions
- Rejection rate (percentage)

### 12.2 Charts and Visualisations

| Chart | What It Shows |
|---|---|
| **Top Prescribed Antibiotics** | A bar chart of the 8 most frequently prescribed antibiotics. |
| **Monthly Prescription Trends** | A line chart showing prescription volume and MDR case counts over the last 6 months. |
| **Patient Risk Distribution** | A pie chart showing the breakdown of patients by risk classification (Type 1–4). |
| **MDR Pathogen Analysis** | A pie chart showing the proportion of lab reports with MDR vs non-MDR organisms. |

### 12.3 Data Export

All analytics data can be exported as a single CSV file containing prescription statistics, antibiotic usage counts, MDR analysis, patient risk distribution, and monthly trend data.

---

## 13. Profile Management

Every user has a **Profile** page where they can:

- View and update their full name.
- Select their department from a predefined list (e.g., Internal Medicine, Infectious Disease, ICU/Critical Care, Pharmacy, Microbiology Lab, Nursing, etc.).
- Upload or change their profile picture (avatar).
- View their assigned role and account information.
- View their email address (which cannot be changed).

---

## 14. Notifications

BACTI-GO includes a notification system accessible via the **bell icon** in the top header.

- Notifications alert users to relevant system events (e.g., prescription status changes, new lab report uploads).
- Unread notifications are indicated by a visual badge on the bell icon.
- Clicking a notification navigates the user to the related record.

---

## 15. Safety and Governance Mechanisms

BACTI-GO incorporates multiple layers of safety and governance to ensure responsible antibiotic use:

### 15.1 Allergy Cross-Reactivity Checking

The system checks the selected antibiotic against the patient's documented allergies, including known cross-reactivity patterns (e.g., Penicillin allergy and Cephalosporin cross-reactivity).

### 15.2 Renal Dose Adjustment Warnings

For patients with impaired renal function, the system flags antibiotics that may require dose adjustment (e.g., Gentamicin, Vancomycin, Ciprofloxacin).

### 15.3 Culture-Based Resistance Alerts

If a lab report is linked to the prescription and the culture shows resistance to the selected antibiotic, the system raises a critical alert that must be acknowledged.

### 15.4 Restricted Antibiotic Governance

Restricted antibiotics (Meropenem, Imipenem, Vancomycin, Linezolid, Colistin, Tigecycline) trigger mandatory:
- Written clinical justification by the prescribing doctor.
- Administrative review and approval before the prescription is finalised.

### 15.5 Broad-Spectrum Flagging

The system automatically identifies and flags broad-spectrum antibiotics (e.g., Piperacillin-Tazobactam, Meropenem, Ceftriaxone, Fluoroquinolones) to support awareness of spectrum usage.

### 15.6 High-Risk Patient Alerts

For patients classified as Type 3 (High Risk) or Type 4 (Critical), additional advisory warnings remind the prescriber to consider broader coverage or await culture results before empiric therapy.

### 15.7 Mandatory Acknowledgment

Critical safety warnings (allergy, resistance) **cannot be bypassed**. The prescriber must explicitly acknowledge each warning before the system allows the prescription to be submitted. All acknowledged warnings are stored as part of the prescription record.

### 15.8 Clinical Disclaimer

A persistent reminder is displayed on the dashboard that BACTI-GO is a decision-support tool and that all clinical decisions must be verified by the treating physician against current hospital guidelines.

---

## 16. Staff Accountability and Audit Trail

BACTI-GO enforces staff accountability across the entire system:

- **Every clinical action** (adding a patient, uploading a lab report, creating a prescription) records the identity of the staff member who performed it.
- Staff names are displayed in the format **"Name (Role)"** — for example, "Kishan (Nurse)" or "Priya (Doctor)".
- This naming convention appears consistently across:
  - Patient records (who added the patient)
  - Lab reports (who uploaded the report)
  - Prescriptions (who prescribed, who approved/rejected)
  - The dashboard activity feed
- An **audit log** records changes to records, including what was changed, who changed it, and when.

---

## 17. Data Export and Reporting

BACTI-GO supports CSV export for external reporting and record-keeping:

| Export Location | What Is Exported |
|---|---|
| **Admin Panel → User Management** | Full user list with name, email, role, department, and join date. |
| **Admin Panel → Pending Reviews** | All pending restricted antibiotic prescriptions with clinical details. |
| **Analytics Dashboard** | Aggregated analytics: prescription statistics, antibiotic usage, MDR analysis, patient risk distribution, and monthly trends. |

CSV files are downloaded directly to the user's device and can be opened in any spreadsheet application.

---

## 18. Current System Capabilities Summary

| Capability | Status |
|---|---|
| Patient registration with demographic and clinical details | ✅ Available |
| Automatic patient risk classification (Type 1–4) | ✅ Available |
| Medical history document upload with OCR and AI summarisation | ✅ Available |
| Lab report upload with OCR text extraction | ✅ Available |
| AI-generated medical summaries for lab reports | ✅ Available |
| Manual organism and sensitivity data entry | ✅ Available |
| MDR organism flagging | ✅ Available |
| Guideline-based antibiotic recommendations | ✅ Available |
| Culture-guided antibiotic recommendations | ✅ Available |
| Drug allergy and cross-reactivity safety checks | ✅ Available |
| Renal dose adjustment warnings | ✅ Available |
| Culture resistance alerts | ✅ Available |
| Restricted antibiotic governance (justification + approval) | ✅ Available |
| Broad-spectrum antibiotic flagging | ✅ Available |
| Role-based access control (Doctor, Nurse, Admin) | ✅ Available |
| User management (assign, change, remove roles) | ✅ Available |
| Staff accountability with audit trail | ✅ Available |
| Real-time dashboard with activity feed | ✅ Available |
| Stewardship analytics with charts and trends | ✅ Available |
| CSV data export | ✅ Available |
| Mobile-first responsive interface | ✅ Available |
| Notification system | ✅ Available |
| Profile management with avatar upload | ✅ Available |
| Searchable antibiotic guidelines reference | ✅ Available |

---

## 19. Glossary

| Term | Definition |
|---|---|
| **AMR** | Antimicrobial Resistance — the ability of microorganisms to resist the effects of drugs that were once effective against them. |
| **CDSS** | Clinical Decision Support System — a tool that helps clinicians make evidence-based decisions at the point of care. |
| **Culture & Sensitivity (C&S)** | A laboratory test that identifies the organism causing an infection and determines which antibiotics it is sensitive or resistant to. |
| **De-escalation** | The practice of switching from a broad-spectrum antibiotic to a narrower-spectrum one based on culture results. |
| **Empiric Therapy** | Antibiotic treatment started before culture results are available, based on clinical judgment and guidelines. |
| **ICMR-AMR** | Indian Council of Medical Research — Antimicrobial Resistance surveillance programme. |
| **MDR** | Multi-Drug Resistant — an organism that is resistant to three or more classes of antibiotics. |
| **MRSA** | Methicillin-Resistant Staphylococcus Aureus. |
| **ESBL** | Extended-Spectrum Beta-Lactamase — enzymes that confer resistance to many antibiotics. |
| **CRE** | Carbapenem-Resistant Enterobacteriaceae. |
| **OCR** | Optical Character Recognition — technology that extracts text from images or scanned documents. |
| **OPD** | Outpatient Department. |
| **IPD** | Inpatient Department. |
| **ICU** | Intensive Care Unit. |
| **RTI** | Respiratory Tract Infection. |
| **UTI** | Urinary Tract Infection. |
| **SSTI** | Skin and Soft Tissue Infection. |
| **IAI** | Intra-Abdominal Infection. |
| **CNS** | Central Nervous System (infection). |
| **BSI** | Bloodstream Infection. |
| **Stewardship** | A coordinated programme to promote the appropriate use of antibiotics, reduce resistance, and improve patient outcomes. |

---

*This document describes the BACTI-GO system as of March 2026. Capabilities may evolve as the system is updated.*
