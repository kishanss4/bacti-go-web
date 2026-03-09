import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OcrResult {
  organisms: { name: string }[];
  sensitivities: { organism: string; antibiotic: string; result: "S" | "R" | "I" }[];
  specimenType?: string;
  reportType?: string;
  isMdr: boolean;
  mdrType: string[];
  rawText: string;
  medicalSummary: string;
}

// Common antibiotic patterns
const antibioticPatterns = [
  "amoxicillin", "amoxicillin-clavulanate", "ampicillin", "azithromycin",
  "cefazolin", "ceftriaxone", "cefuroxime", "ceftazidime", "cefepime",
  "ciprofloxacin", "clindamycin", "doxycycline", "erythromycin",
  "gentamicin", "imipenem", "levofloxacin", "linezolid", "meropenem",
  "metronidazole", "nitrofurantoin", "penicillin", "piperacillin-tazobactam",
  "trimethoprim-sulfamethoxazole", "vancomycin", "colistin", "tigecycline"
];

// Common organism patterns
const organismPatterns = [
  "escherichia coli", "e. coli", "e.coli",
  "staphylococcus aureus", "s. aureus", "staph aureus", "mrsa",
  "klebsiella pneumoniae", "k. pneumoniae",
  "pseudomonas aeruginosa", "p. aeruginosa",
  "enterococcus faecalis", "e. faecalis",
  "enterococcus faecium", "e. faecium",
  "streptococcus pneumoniae", "s. pneumoniae",
  "acinetobacter baumannii", "a. baumannii",
  "proteus mirabilis", "p. mirabilis",
  "enterobacter cloacae", "e. cloacae",
  "candida albicans", "c. albicans",
  "salmonella", "shigella", "campylobacter"
];

// MDR detection patterns
const mdrPatterns: Record<string, string[]> = {
  "MRSA": ["mrsa", "methicillin-resistant", "methicillin resistant"],
  "ESBL": ["esbl", "extended-spectrum beta-lactamase", "extended spectrum beta lactamase"],
  "VRE": ["vre", "vancomycin-resistant enterococcus", "vancomycin resistant enterococcus"],
  "CRE": ["cre", "carbapenem-resistant", "carbapenem resistant"],
  "MDR-TB": ["mdr-tb", "multi-drug resistant tuberculosis", "multidrug resistant tb"]
};

function extractOrganisms(text: string): { name: string }[] {
  const lowerText = text.toLowerCase();
  const found: { name: string }[] = [];
  const seen = new Set<string>();

  for (const pattern of organismPatterns) {
    if (lowerText.includes(pattern) && !seen.has(pattern)) {
      let name = pattern;
      if (pattern.includes("e. coli") || pattern === "e.coli") name = "Escherichia coli";
      else if (pattern.includes("s. aureus") || pattern === "staph aureus") name = "Staphylococcus aureus";
      else if (pattern === "mrsa") name = "MRSA (Staphylococcus aureus)";
      else if (pattern.includes("k. pneumoniae")) name = "Klebsiella pneumoniae";
      else if (pattern.includes("p. aeruginosa")) name = "Pseudomonas aeruginosa";
      else name = pattern.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

      if (!seen.has(name.toLowerCase())) {
        found.push({ name });
        seen.add(name.toLowerCase());
      }
    }
  }

  return found;
}

function extractSensitivities(text: string, organisms: { name: string }[]): { organism: string; antibiotic: string; result: "S" | "R" | "I" }[] {
  const sensitivities: { organism: string; antibiotic: string; result: "S" | "R" | "I" }[] = [];
  const lowerText = text.toLowerCase();
  const lines = text.split("\n");
  const defaultOrganism = organisms.length === 1 ? organisms[0].name : "Unknown";

  for (const antibiotic of antibioticPatterns) {
    if (lowerText.includes(antibiotic)) {
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        if (lineLower.includes(antibiotic)) {
          let result: "S" | "R" | "I" = "S";

          if (lineLower.includes(" r ") || lineLower.includes(" r\t") || 
              lineLower.includes("resistant") || lineLower.includes("(r)") ||
              lineLower.match(new RegExp(`${antibiotic}\\s+r\\b`, "i"))) {
            result = "R";
          } else if (lineLower.includes(" i ") || lineLower.includes(" i\t") ||
                     lineLower.includes("intermediate") || lineLower.includes("(i)") ||
                     lineLower.match(new RegExp(`${antibiotic}\\s+i\\b`, "i"))) {
            result = "I";
          } else if (lineLower.includes(" s ") || lineLower.includes(" s\t") ||
                     lineLower.includes("sensitive") || lineLower.includes("susceptible") ||
                     lineLower.includes("(s)") ||
                     lineLower.match(new RegExp(`${antibiotic}\\s+s\\b`, "i"))) {
            result = "S";
          }

          const formattedAntibiotic = antibiotic
            .split("-")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join("-");

          if (!sensitivities.find(s => s.antibiotic.toLowerCase() === antibiotic && s.organism === defaultOrganism)) {
            sensitivities.push({ organism: defaultOrganism, antibiotic: formattedAntibiotic, result });
          }
          break;
        }
      }
    }
  }

  return sensitivities;
}

function detectMdr(text: string): { isMdr: boolean; mdrType: string[] } {
  const lowerText = text.toLowerCase();
  const detectedTypes: string[] = [];

  for (const [type, patterns] of Object.entries(mdrPatterns)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        if (!detectedTypes.includes(type)) {
          detectedTypes.push(type);
        }
        break;
      }
    }
  }

  return { isMdr: detectedTypes.length > 0, mdrType: detectedTypes };
}

function detectSpecimenType(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  const specimenTypes: Record<string, string[]> = {
    "Blood": ["blood culture", "blood sample", "blood specimen"],
    "Urine": ["urine culture", "urine sample", "mid-stream urine", "msu", "urinalysis"],
    "Sputum": ["sputum culture", "sputum sample", "respiratory sample"],
    "Wound swab": ["wound swab", "wound culture", "skin swab"],
    "CSF": ["csf", "cerebrospinal fluid", "spinal fluid"],
    "Stool": ["stool culture", "stool sample", "fecal sample"],
    "Tracheal aspirate": ["tracheal aspirate", "ta sample"],
    "Bronchoalveolar lavage": ["bal", "bronchoalveolar lavage", "bronchial washing"],
  };

  for (const [type, patterns] of Object.entries(specimenTypes)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) return type;
    }
  }

  return undefined;
}

function generateMedicalSummary(
  organisms: { name: string }[],
  sensitivities: { organism: string; antibiotic: string; result: "S" | "R" | "I" }[],
  specimenType: string | undefined,
  isMdr: boolean,
  mdrType: string[],
  rawText: string
): string {
  const lines: string[] = [];
  
  lines.push("═══ CLINICAL LABORATORY SUMMARY ═══");
  lines.push("");
  
  // Specimen info
  lines.push(`📋 Specimen Type: ${specimenType || "Not specified"}`);
  lines.push("");
  
  // Organisms
  if (organisms.length > 0) {
    lines.push("🔬 ISOLATED ORGANISMS:");
    organisms.forEach((org, i) => {
      lines.push(`  ${i + 1}. ${org.name}`);
    });
  } else {
    lines.push("🔬 No organisms identified from the report text.");
  }
  lines.push("");
  
  // MDR Alert
  if (isMdr) {
    lines.push("⚠️ MULTI-DRUG RESISTANCE ALERT:");
    lines.push(`  Detected MDR patterns: ${mdrType.join(", ")}`);
    lines.push("  → Infection control measures recommended");
    lines.push("  → Consider Infectious Disease consultation");
    lines.push("");
  }
  
  // Sensitivity Summary
  if (sensitivities.length > 0) {
    const sensitive = sensitivities.filter(s => s.result === "S");
    const resistant = sensitivities.filter(s => s.result === "R");
    const intermediate = sensitivities.filter(s => s.result === "I");
    
    lines.push("💊 ANTIBIOTIC SENSITIVITY PROFILE:");
    lines.push("");
    
    if (sensitive.length > 0) {
      lines.push("  ✅ SENSITIVE (Recommended options):");
      sensitive.forEach(s => {
        lines.push(`    • ${s.antibiotic} — organism responds to treatment`);
      });
      lines.push("");
    }
    
    if (resistant.length > 0) {
      lines.push("  ❌ RESISTANT (Avoid):");
      resistant.forEach(s => {
        lines.push(`    • ${s.antibiotic} — organism is resistant`);
      });
      lines.push("");
    }
    
    if (intermediate.length > 0) {
      lines.push("  ⚡ INTERMEDIATE:");
      intermediate.forEach(s => {
        lines.push(`    • ${s.antibiotic} — may require higher doses`);
      });
      lines.push("");
    }
    
    // Treatment recommendation
    lines.push("📌 TREATMENT RECOMMENDATION:");
    if (sensitive.length > 0) {
      lines.push(`  First-choice antibiotics based on culture: ${sensitive.slice(0, 3).map(s => s.antibiotic).join(", ")}`);
      if (resistant.length > 0) {
        lines.push(`  Avoid: ${resistant.map(s => s.antibiotic).join(", ")}`);
      }
    } else {
      lines.push("  No clear sensitivity data — consider empiric therapy based on local guidelines.");
    }
  } else {
    lines.push("💊 No antibiotic sensitivity data extracted.");
    lines.push("  Manual review of the original report is recommended.");
  }
  
  lines.push("");
  lines.push("─────────────────────────────────");
  lines.push("Note: This is an auto-generated summary from OCR text extraction.");
  lines.push("Always verify against the original lab report document.");
  
  return lines.join("\n");
}

function processOcrText(text: string): OcrResult {
  const organisms = extractOrganisms(text);
  const sensitivities = extractSensitivities(text, organisms);
  const { isMdr, mdrType } = detectMdr(text);
  const specimenType = detectSpecimenType(text);
  const medicalSummary = generateMedicalSummary(organisms, sensitivities, specimenType, isMdr, mdrType, text);

  return {
    organisms,
    sensitivities,
    specimenType,
    reportType: "Culture & Sensitivity",
    isMdr,
    mdrType,
    rawText: text,
    medicalSummary,
  };
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { labReportId, ocrText } = await req.json();

    if (!labReportId || !ocrText) {
      throw new Error("Missing labReportId or ocrText");
    }

    const result = processOcrText(ocrText);

    const { error: updateError } = await supabase
      .from("lab_reports")
      .update({
        ocr_text: result.rawText,
        ocr_processed: true,
        organisms: result.organisms,
        sensitivities: result.sensitivities,
        is_mdr: result.isMdr,
        mdr_type: result.mdrType,
        specimen_type: result.specimenType || undefined,
        medical_summary: result.medicalSummary,
      })
      .eq("id", labReportId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          organisms: result.organisms,
          sensitivities: result.sensitivities,
          isMdr: result.isMdr,
          mdrType: result.mdrType,
          specimenType: result.specimenType,
          medicalSummary: result.medicalSummary,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("OCR processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
