import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Stethoscope,
  Search,
  Loader2,
  AlertTriangle,
  Info,
  Pill,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Guideline = Database["public"]["Tables"]["antibiotic_guidelines"]["Row"];
type InfectionSite = Database["public"]["Enums"]["infection_site"];
type ClinicalSetting = Database["public"]["Enums"]["clinical_setting"];
type PatientType = Database["public"]["Enums"]["patient_type"];

export default function GuidelinesPage() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInfectionSite, setFilterInfectionSite] = useState<string>("all");
  const [filterClinicalSetting, setFilterClinicalSetting] = useState<string>("all");
  const [filterPatientType, setFilterPatientType] = useState<string>("all");

  useEffect(() => {
    fetchGuidelines();
  }, []);

  const fetchGuidelines = async () => {
    try {
      const { data, error } = await supabase
        .from("antibiotic_guidelines")
        .select("*")
        .order("infection_site");

      if (error) throw error;
      setGuidelines(data || []);
    } catch (error) {
      console.error("Error fetching guidelines:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuidelines = guidelines.filter((guideline) => {
    const matchesSearch =
      searchQuery === "" ||
      guideline.infection_site?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(guideline.first_line_antibiotics).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesInfectionSite =
      filterInfectionSite === "all" || guideline.infection_site === filterInfectionSite;

    const matchesClinicalSetting =
      filterClinicalSetting === "all" || guideline.clinical_setting === filterClinicalSetting;

    const matchesPatientType =
      filterPatientType === "all" || guideline.patient_type === filterPatientType;

    return matchesSearch && matchesInfectionSite && matchesClinicalSetting && matchesPatientType;
  });

  const infectionSites: InfectionSite[] = ["rti", "uti", "ssti", "iai", "cns", "bsi"];

  const clinicalSettings: ClinicalSetting[] = ["opd", "ipd", "icu"];

  const patientTypes: PatientType[] = ["type_1", "type_2", "type_3", "type_4"];

  const formatInfectionSite = (site: string) => {
    return site
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatPatientType = (type: string) => {
    const labels: Record<string, string> = {
      type_1: "Type 1 - Low Risk",
      type_2: "Type 2 - Moderate",
      type_3: "Type 3 - High Risk",
      type_4: "Type 4 - Critical",
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" />
          Antibiotic Guidelines
        </h1>
        <p className="text-muted-foreground mt-1">
          Evidence-based antibiotic recommendations by infection site and patient type
        </p>
      </div>

      {/* Filters */}
      <Card className="glass border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search guidelines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filterInfectionSite} onValueChange={setFilterInfectionSite}>
              <SelectTrigger>
                <SelectValue placeholder="Infection Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Infection Sites</SelectItem>
                {infectionSites.map((site) => (
                  <SelectItem key={site} value={site}>
                    {formatInfectionSite(site)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClinicalSetting} onValueChange={setFilterClinicalSetting}>
              <SelectTrigger>
                <SelectValue placeholder="Clinical Setting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Settings</SelectItem>
                {clinicalSettings.map((setting) => (
                  <SelectItem key={setting} value={setting}>
                    {setting.charAt(0).toUpperCase() + setting.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPatientType} onValueChange={setFilterPatientType}>
              <SelectTrigger>
                <SelectValue placeholder="Patient Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patient Types</SelectItem>
                {patientTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatPatientType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredGuidelines.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="py-12 text-center">
            <Stethoscope className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No guidelines found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGuidelines.map((guideline) => (
            <Card key={guideline.id} className="glass border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {formatInfectionSite(guideline.infection_site)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {guideline.clinical_setting}
                      </Badge>
                      <Badge variant="secondary">
                        {formatPatientType(guideline.patient_type)}
                      </Badge>
                      {guideline.is_pediatric && (
                        <Badge variant="secondary">Pediatric</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* First Line Antibiotics */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    First-Line Options
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(guideline.first_line_antibiotics) &&
                      (guideline.first_line_antibiotics as any[]).map((ab: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-primary/10 border border-primary/20"
                        >
                          <p className="font-medium text-sm">{ab.name || ab}</p>
                          {ab.dose && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {ab.dose} {ab.route} {ab.frequency}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Alternative Antibiotics */}
                {Array.isArray(guideline.alternative_antibiotics) &&
                  (guideline.alternative_antibiotics as any[]).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Alternative Options</h4>
                      <div className="space-y-2">
                        {(guideline.alternative_antibiotics as any[]).map((ab: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-muted/50 border border-border/50"
                          >
                            <p className="font-medium text-sm">{ab.name || ab}</p>
                            {ab.dose && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {ab.dose} {ab.route} {ab.frequency}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Duration */}
                {(guideline.duration_days_min || guideline.duration_days_max) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="w-4 h-4 text-primary" />
                    <span>
                      Duration: {guideline.duration_days_min}
                      {guideline.duration_days_max &&
                        guideline.duration_days_max !== guideline.duration_days_min &&
                        ` - ${guideline.duration_days_max}`}{" "}
                      days
                    </span>
                  </div>
                )}

                {/* Warnings */}
                {guideline.warnings && guideline.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning">Warnings</p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                          {guideline.warnings.map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dosing Notes */}
                {guideline.dosing_notes && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: {guideline.dosing_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Source */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Source</p>
            <p className="text-xs text-muted-foreground mt-1">
              Guidelines are based on hospital antibiotic policy. Always verify against current institutional protocols.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
