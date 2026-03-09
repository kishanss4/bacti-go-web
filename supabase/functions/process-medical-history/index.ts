import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Medical history keywords and section patterns
const sectionPatterns: Record<string, string[]> = {
  "Past Medical History": [
    "past medical history", "pmh", "medical history", "known case of",
    "diagnosed with", "history of", "chronic conditions", "comorbidities",
    "previous diagnosis", "known diseases",
  ],
  "Surgical History": [
    "surgical history", "past surgical", "previous surgeries", "operations",
    "underwent", "surgery", "appendectomy", "cholecystectomy", "hernia repair",
    "caesarean", "c-section", "bypass", "amputation",
  ],
  "Medications": [
    "current medications", "medications", "drugs", "on treatment",
    "prescribed", "taking", "medication list", "drug history",
    "tab.", "cap.", "inj.", "syrup",
  ],
  "Allergies": [
    "allergies", "allergic to", "drug allergy", "known allergies",
    "nkda", "no known drug allergies", "adverse reaction",
  ],
  "Family History": [
    "family history", "father", "mother", "sibling", "hereditary",
    "genetic", "family h/o", "familial",
  ],
  "Social History": [
    "social history", "smoking", "alcohol", "tobacco", "drug use",
    "occupation", "lifestyle", "exercise", "diet", "smoker", "non-smoker",
    "drinks", "teetotaler",
  ],
  "Previous Hospitalizations": [
    "previous admission", "hospitalized", "admitted", "hospital stay",
    "icu admission", "ventilator", "previous hospitalization",
  ],
  "Immunization History": [
    "immunization", "vaccination", "vaccine", "immunized",
    "covid vaccine", "flu shot", "hepatitis b",
  ],
  "Vital Signs / Examination": [
    "vital signs", "blood pressure", "bp:", "heart rate", "hr:",
    "temperature", "spo2", "respiratory rate", "rr:", "bmi",
    "height", "weight", "pulse",
  ],
};

// Common medical conditions
const conditionPatterns: Record<string, string[]> = {
  "Diabetes Mellitus": ["diabetes", "dm", "type 2 dm", "type 1 dm", "t2dm", "t1dm", "diabetic", "hyperglycemia", "hba1c"],
  "Hypertension": ["hypertension", "htn", "high blood pressure", "elevated bp"],
  "Cardiovascular Disease": ["cad", "coronary artery", "myocardial infarction", "mi", "heart failure", "chf", "angina", "atrial fibrillation", "af"],
  "Chronic Kidney Disease": ["ckd", "chronic kidney", "renal failure", "dialysis", "creatinine elevated", "egfr"],
  "COPD / Asthma": ["copd", "chronic obstructive", "asthma", "bronchitis", "emphysema", "inhaler"],
  "Liver Disease": ["liver disease", "cirrhosis", "hepatitis", "fatty liver", "nafld", "liver failure"],
  "Cancer": ["cancer", "malignancy", "tumor", "carcinoma", "lymphoma", "leukemia", "chemotherapy", "radiation"],
  "Thyroid Disorders": ["thyroid", "hypothyroid", "hyperthyroid", "tsh", "levothyroxine"],
  "Neurological": ["stroke", "cva", "epilepsy", "seizure", "parkinson", "alzheimer", "dementia", "neuropathy"],
  "Autoimmune": ["rheumatoid", "lupus", "sle", "autoimmune", "immunosuppressed"],
};

function extractSections(text: string): Record<string, string[]> {
  const lowerText = text.toLowerCase();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: Record<string, string[]> = {};

  for (const [section, patterns] of Object.entries(sectionPatterns)) {
    const relevantLines: string[] = [];
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (patterns.some((p) => lineLower.includes(p))) {
        relevantLines.push(line);
      }
    }
    if (relevantLines.length > 0) {
      sections[section] = relevantLines;
    }
  }

  return sections;
}

function detectConditions(text: string): string[] {
  const lowerText = text.toLowerCase();
  const detected: string[] = [];

  for (const [condition, patterns] of Object.entries(conditionPatterns)) {
    if (patterns.some((p) => lowerText.includes(p))) {
      detected.push(condition);
    }
  }

  return detected;
}

function generateMedicalHistorySummary(
  ocrText: string,
  patientName: string
): string {
  const sections = extractSections(ocrText);
  const conditions = detectConditions(ocrText);
  const lines: string[] = [];

  lines.push("═══ MEDICAL HISTORY SUMMARY ═══");
  lines.push(`Patient: ${patientName}`);
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push("");

  // Detected conditions
  if (conditions.length > 0) {
    lines.push("🏥 IDENTIFIED CONDITIONS:");
    conditions.forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c}`);
    });
    lines.push("");
  }

  // Sections
  for (const [section, content] of Object.entries(sections)) {
    const icon =
      section === "Allergies"
        ? "⚠️"
        : section === "Medications"
        ? "💊"
        : section === "Surgical History"
        ? "🔪"
        : section === "Family History"
        ? "👪"
        : section === "Social History"
        ? "🏠"
        : section === "Previous Hospitalizations"
        ? "🏨"
        : section === "Immunization History"
        ? "💉"
        : section === "Vital Signs / Examination"
        ? "📊"
        : "📋";

    lines.push(`${icon} ${section.toUpperCase()}:`);
    // Deduplicate and limit
    const unique = [...new Set(content)];
    unique.slice(0, 8).forEach((line) => {
      lines.push(`  • ${line}`);
    });
    lines.push("");
  }

  // If nothing was extracted, include raw text excerpt
  if (Object.keys(sections).length === 0 && conditions.length === 0) {
    lines.push("📄 RAW EXTRACTED TEXT (no structured sections detected):");
    lines.push("");
    const excerpt = ocrText.substring(0, 2000);
    lines.push(excerpt);
    lines.push("");
    lines.push("⚠️ Unable to parse structured medical history from document.");
    lines.push("   Manual review is recommended.");
  } else {
    // Clinical summary
    lines.push("─────────────────────────────────");
    lines.push("📌 CLINICAL RELEVANCE:");
    if (conditions.length > 0) {
      lines.push(
        `  Known conditions: ${conditions.join(", ")}`
      );
    }

    // Flag high-risk patterns
    const lowerText = ocrText.toLowerCase();
    const risks: string[] = [];
    if (lowerText.includes("immunosuppressed") || lowerText.includes("immunocompromised"))
      risks.push("Immunocompromised");
    if (lowerText.includes("dialysis") || lowerText.includes("ckd"))
      risks.push("Renal impairment - dose adjustments needed");
    if (lowerText.includes("liver") || lowerText.includes("cirrhosis"))
      risks.push("Hepatic impairment");
    if (conditions.some((c) => c.includes("Cancer")))
      risks.push("Oncology patient - infection risk elevated");
    if (lowerText.includes("allerg"))
      risks.push("Drug allergies documented - verify before prescribing");

    if (risks.length > 0) {
      lines.push("");
      lines.push("  ⚡ KEY ALERTS:");
      risks.forEach((r) => lines.push(`    → ${r}`));
    }
  }

  lines.push("");
  lines.push("─────────────────────────────────");
  lines.push(
    "Note: Auto-generated from OCR extraction. Verify against original document."
  );

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { patientId, ocrText, patientName } = await req.json();

    if (!patientId || !ocrText) {
      throw new Error("Missing patientId or ocrText");
    }

    const summary = generateMedicalHistorySummary(
      ocrText,
      patientName || "Unknown Patient"
    );

    return new Response(
      JSON.stringify({ success: true, summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Medical history processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
