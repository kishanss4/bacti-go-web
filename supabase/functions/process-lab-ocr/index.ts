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
const mdrPatterns = {
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
      // Normalize organism name
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

  // Default organism if only one found
  const defaultOrganism = organisms.length === 1 ? organisms[0].name : "Unknown";

  for (const antibiotic of antibioticPatterns) {
    if (lowerText.includes(antibiotic)) {
      // Look for sensitivity patterns near the antibiotic
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        if (lineLower.includes(antibiotic)) {
          let result: "S" | "R" | "I" = "S"; // Default to sensitive if found

          // Check for resistance indicators
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

          // Avoid duplicates
          if (!sensitivities.find(s => s.antibiotic.toLowerCase() === antibiotic && s.organism === defaultOrganism)) {
            sensitivities.push({
              organism: defaultOrganism,
              antibiotic: formattedAntibiotic,
              result,
            });
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

  return {
    isMdr: detectedTypes.length > 0,
    mdrType: detectedTypes,
  };
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
      if (lowerText.includes(pattern)) {
        return type;
      }
    }
  }

  return undefined;
}

function processOcrText(text: string): OcrResult {
  const organisms = extractOrganisms(text);
  const sensitivities = extractSensitivities(text, organisms);
  const { isMdr, mdrType } = detectMdr(text);
  const specimenType = detectSpecimenType(text);

  return {
    organisms,
    sensitivities,
    specimenType,
    reportType: "Culture & Sensitivity",
    isMdr,
    mdrType,
    rawText: text,
  };
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Process the OCR text
    const result = processOcrText(ocrText);

    // Update the lab report with extracted data
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
