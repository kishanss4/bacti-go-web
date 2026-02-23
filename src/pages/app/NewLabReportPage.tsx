import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Upload,
  Loader2,
  ArrowLeft,
  User,
  AlertTriangle,
  Plus,
  X,
  Camera,
  Image,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];

interface OrganismEntry {
  id: string;
  name: string;
  sensitivities: { antibiotic: string; result: "S" | "R" | "I" }[];
}

export default function NewLabReportPage() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrComplete, setOcrComplete] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    patient_id: searchParams.get("patient") || "",
    report_type: "Culture",
    specimen_type: "",
    specimen_date: "",
    is_mdr: false,
    mdr_type: [] as string[],
  });

  const [organisms, setOrganisms] = useState<OrganismEntry[]>([]);
  const [newOrganism, setNewOrganism] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const addOrganism = () => {
    if (!newOrganism.trim()) return;
    setOrganisms([
      ...organisms,
      {
        id: crypto.randomUUID(),
        name: newOrganism.trim(),
        sensitivities: [],
      },
    ]);
    setNewOrganism("");
  };

  const removeOrganism = (id: string) => {
    setOrganisms(organisms.filter((o) => o.id !== id));
  };

  const addSensitivity = (organismId: string, antibiotic: string, result: "S" | "R" | "I") => {
    setOrganisms(
      organisms.map((o) =>
        o.id === organismId
          ? {
              ...o,
              sensitivities: [...o.sensitivities, { antibiotic, result }],
            }
          : o
      )
    );
  };

  const removeSensitivity = (organismId: string, antibiotic: string) => {
    setOrganisms(
      organisms.map((o) =>
        o.id === organismId
          ? {
              ...o,
              sensitivities: o.sensitivities.filter((s) => s.antibiotic !== antibiotic),
            }
          : o
      )
    );
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WebP, or PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setOcrComplete(false);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setOcrComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFileAndProcess = async (labReportId: string): Promise<{ fileUrl: string; fileName: string } | null> => {
    if (!selectedFile) return null;

    try {
      setUploadProgress(10);
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${labReportId}/${Date.now()}.${fileExt}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("lab-reports")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);
      const { data: urlData } = supabase.storage
        .from("lab-reports")
        .getPublicUrl(fileName);

      setUploadProgress(100);
      return { fileUrl: urlData.publicUrl, fileName: selectedFile.name };
    } catch (error) {
      console.error("File upload error:", error);
      return null;
    }
  };

  const processOcrForReport = async (labReportId: string, ocrText: string) => {
    setProcessingOcr(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-lab-ocr", {
        body: { labReportId, ocrText },
      });

      if (error) throw error;

      if (data?.success && data.result) {
        // Update local state with OCR results
        if (data.result.organisms?.length > 0) {
          const newOrganisms: OrganismEntry[] = data.result.organisms.map((org: { name: string }) => ({
            id: crypto.randomUUID(),
            name: org.name,
            sensitivities: data.result.sensitivities
              ?.filter((s: any) => s.organism === org.name || s.organism === "Unknown")
              .map((s: any) => ({ antibiotic: s.antibiotic, result: s.result })) || [],
          }));
          setOrganisms(newOrganisms);
        }

        if (data.result.isMdr) {
          setFormData((prev) => ({
            ...prev,
            is_mdr: true,
            mdr_type: data.result.mdrType || [],
          }));
        }

        if (data.result.specimenType) {
          setFormData((prev) => ({
            ...prev,
            specimen_type: data.result.specimenType,
          }));
        }

        setOcrComplete(true);
        toast({
          title: "OCR Processing Complete",
          description: `Found ${data.result.organisms?.length || 0} organisms and ${data.result.sensitivities?.length || 0} sensitivities`,
        });
      }
    } catch (error: any) {
      console.error("OCR processing error:", error);
      toast({
        title: "OCR Processing Failed",
        description: "Manual entry required",
        variant: "destructive",
      });
    } finally {
      setProcessingOcr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First create the lab report
      const { data, error } = await supabase
        .from("lab_reports")
        .insert({
          patient_id: formData.patient_id,
          report_type: formData.report_type,
          specimen_type: formData.specimen_type || null,
          specimen_date: formData.specimen_date || null,
          is_mdr: formData.is_mdr,
          mdr_type: formData.is_mdr ? formData.mdr_type : null,
          organisms: organisms.map((o) => ({ name: o.name })),
          sensitivities: organisms.flatMap((o) =>
            o.sensitivities.map((s) => ({
              organism: o.name,
              antibiotic: s.antibiotic,
              result: s.result,
            }))
          ),
          uploaded_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Upload file if selected
      if (selectedFile && data) {
        const fileResult = await uploadFileAndProcess(data.id);
        if (fileResult) {
          await supabase
            .from("lab_reports")
            .update({
              file_url: fileResult.fileUrl,
              file_name: fileResult.fileName,
            })
            .eq("id", data.id);
        }
      }

      toast({
        title: "Report created",
        description: "Lab report has been added successfully.",
      });

      navigate(`/lab-reports/${data.id}`);
    } catch (error: any) {
      console.error("Error creating lab report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lab report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const specimenTypes = [
    "Blood",
    "Urine",
    "Sputum",
    "Wound swab",
    "CSF",
    "Stool",
    "Tissue",
    "Tracheal aspirate",
    "Bronchoalveolar lavage",
    "Other",
  ];

  const mdrTypes = ["MRSA", "ESBL", "VRE", "CRE", "MDR-TB", "Other"];

  const commonAntibiotics = [
    "Amoxicillin",
    "Amoxicillin-Clavulanate",
    "Ampicillin",
    "Azithromycin",
    "Cefazolin",
    "Ceftriaxone",
    "Cefuroxime",
    "Ciprofloxacin",
    "Clindamycin",
    "Doxycycline",
    "Gentamicin",
    "Imipenem",
    "Levofloxacin",
    "Meropenem",
    "Metronidazole",
    "Nitrofurantoin",
    "Penicillin",
    "Piperacillin-Tazobactam",
    "Trimethoprim-Sulfamethoxazole",
    "Vancomycin",
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            New Lab Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter culture and sensitivity results
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.patient_id}
              onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {loadingPatients ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : patients.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No active patients
                  </div>
                ) : (
                  patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name} ({patient.patient_id || "No ID"})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* File Upload with OCR */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Upload Lab Report Image
            </CardTitle>
            <CardDescription>
              Upload a photo or scan of the lab report for automatic data extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <Image className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">
                  JPEG, PNG, WebP, or PDF (max 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Preview */}
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Lab report preview"
                      className="w-24 h-24 object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {ocrComplete && (
                      <div className="flex items-center gap-1 text-success mt-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">OCR data extracted</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* OCR Processing */}
                {processingOcr && (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Processing with OCR...</span>
                  </div>
                )}

                {/* Manual OCR Trigger (for demo without actual OCR service) */}
                {!ocrComplete && !processingOcr && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change File
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      OCR will process after submission
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Specimen Information */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Specimen Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type *</Label>
                <Select
                  value={formData.report_type}
                  onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Culture">Culture</SelectItem>
                    <SelectItem value="Culture & Sensitivity">Culture & Sensitivity</SelectItem>
                    <SelectItem value="Blood Culture">Blood Culture</SelectItem>
                    <SelectItem value="Urine Culture">Urine Culture</SelectItem>
                    <SelectItem value="Sputum Culture">Sputum Culture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Specimen Type</Label>
                <Select
                  value={formData.specimen_type}
                  onValueChange={(value) => setFormData({ ...formData, specimen_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specimen type" />
                  </SelectTrigger>
                  <SelectContent>
                    {specimenTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specimen Collection Date</Label>
              <Input
                type="date"
                value={formData.specimen_date}
                onChange={(e) => setFormData({ ...formData, specimen_date: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* MDR Status */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Multi-Drug Resistance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>MDR Pathogen Detected</Label>
                <p className="text-xs text-muted-foreground">
                  Multi-drug resistant organism identified
                </p>
              </div>
              <Switch
                checked={formData.is_mdr}
                onCheckedChange={(checked) => setFormData({ ...formData, is_mdr: checked })}
              />
            </div>

            {formData.is_mdr && (
              <div className="space-y-2">
                <Label>MDR Type</Label>
                <div className="flex flex-wrap gap-2">
                  {mdrTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={formData.mdr_type.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (formData.mdr_type.includes(type)) {
                          setFormData({
                            ...formData,
                            mdr_type: formData.mdr_type.filter((t) => t !== type),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            mdr_type: [...formData.mdr_type, type],
                          });
                        }
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organisms & Sensitivities */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Organisms & Sensitivities</CardTitle>
            <CardDescription>Add isolated organisms and their antibiotic sensitivities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Organism */}
            <div className="flex gap-2">
              <Input
                placeholder="Organism name (e.g., E. coli)"
                value={newOrganism}
                onChange={(e) => setNewOrganism(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOrganism();
                  }
                }}
              />
              <Button type="button" onClick={addOrganism} disabled={!newOrganism.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Organism List */}
            {organisms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No organisms added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {organisms.map((organism) => (
                  <div key={organism.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{organism.name}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOrganism(organism.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Sensitivities */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Sensitivities (click to add)
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {organism.sensitivities.map((s) => (
                          <Badge
                            key={s.antibiotic}
                            variant={
                              s.result === "S"
                                ? "default"
                                : s.result === "R"
                                ? "destructive"
                                : "secondary"
                            }
                            className={`cursor-pointer ${s.result === "S" ? "bg-success" : ""}`}
                            onClick={() => removeSensitivity(organism.id, s.antibiotic)}
                          >
                            {s.antibiotic}: {s.result}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>

                      {/* Quick Add Antibiotics */}
                      <Select
                        value=""
                        onValueChange={(antibiotic) => {
                          // Show a sub-menu or default to Sensitive
                          addSensitivity(organism.id, antibiotic, "S");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Add sensitivity..." />
                        </SelectTrigger>
                        <SelectContent>
                          {commonAntibiotics
                            .filter(
                              (ab) => !organism.sensitivities.find((s) => s.antibiotic === ab)
                            )
                            .map((ab) => (
                              <SelectItem key={ab} value={ab}>
                                {ab} (Sensitive)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {/* Toggle results */}
                      {organism.sensitivities.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Click on a sensitivity badge to remove it. Use the dropdown to add more.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" className="gradient-primary" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Report
          </Button>
        </div>
      </form>
    </div>
  );
}
