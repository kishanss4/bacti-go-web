import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Eye,
  History,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createWorker } from "tesseract.js";
import { pdfFirstPageToBlob } from "@/lib/pdfToImage";

interface MedicalHistoryDocument {
  id: string;
  patient_id: string;
  file_url: string;
  file_name: string;
  document_date: string | null;
  document_type: string;
  summary: string | null;
  ocr_text: string | null;
  uploaded_by: string;
  created_at: string;
}

interface MedicalHistorySectionProps {
  patientId: string;
  patientName: string;
  userRole: string | null;
}

const DOCUMENT_TYPES = [
  { value: "general", label: "General Medical Record" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "surgical_notes", label: "Surgical Notes" },
  { value: "lab_history", label: "Lab History" },
  { value: "imaging", label: "Imaging / Radiology" },
  { value: "prescription_history", label: "Prescription History" },
  { value: "referral", label: "Referral Letter" },
  { value: "other", label: "Other" },
];

export default function MedicalHistorySection({
  patientId,
  patientName,
  userRole,
}: MedicalHistorySectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<MedicalHistoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docDate, setDocDate] = useState("");
  const [docType, setDocType] = useState("general");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFileName, setPreviewFileName] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_history_documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("document_date", { ascending: false, nullsFirst: false });

    if (!error && data) {
      setDocuments(data as MedicalHistoryDocument[]);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "PDF, JPEG, PNG, or WebP only", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 20MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress("Uploading file...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${patientId}/${Date.now()}-${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("medical-history")
        .upload(filePath, selectedFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("medical-history")
        .getPublicUrl(filePath);

      setUploadProgress("Running OCR analysis...");

      let ocrText = "";
      if (selectedFile.type === "application/pdf") {
        ocrText = await ocrPdf(selectedFile);
      } else {
        ocrText = await ocrImage(selectedFile);
      }

      setUploadProgress("Generating summary...");

      const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
        "process-medical-history",
        { body: { patientId, ocrText, patientName } }
      );

      const generatedSummary = summaryData?.summary || ocrText;

      // Insert into medical_history_documents
      const { error: insertError } = await supabase
        .from("medical_history_documents")
        .insert({
          patient_id: patientId,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          document_date: docDate || null,
          document_type: docType,
          summary: generatedSummary,
          ocr_text: ocrText,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast({ title: "Document uploaded", description: "OCR analysis complete." });
      setSelectedFile(null);
      setDocDate("");
      setDocType("general");
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const ocrImage = async (file: File): Promise<string> => {
    const worker = await createWorker("eng");
    const imageUrl = URL.createObjectURL(file);
    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);
    return text;
  };

  const ocrPdf = async (file: File): Promise<string> => {
    const blob = await pdfFirstPageToBlob(file);
    const worker = await createWorker("eng");
    const imageUrl = URL.createObjectURL(blob);
    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);
    return text;
  };

  const handleViewFile = async (doc: MedicalHistoryDocument) => {
    try {
      const filePath = doc.file_url.split("/medical-history/")[1];
      if (!filePath) { window.open(doc.file_url, "_blank"); return; }
      const { data, error } = await supabase.storage.from("medical-history").download(filePath);
      if (error) throw error;
      const blobUrl = URL.createObjectURL(data);
      setPreviewUrl(blobUrl);
      setPreviewFileName(doc.file_name);
      setShowPreview(true);
    } catch {
      window.open(doc.file_url, "_blank");
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    try {
      const filePath = fileUrl.split("/medical-history/")[1];
      if (filePath) {
        await supabase.storage.from("medical-history").remove([filePath]);
      }
      await supabase.from("medical_history_documents").delete().eq("id", docId);
      toast({ title: "Document removed" });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReprocess = async (doc: MedicalHistoryDocument) => {
    setUploadProgress(`Re-analyzing ${doc.file_name}...`);
    setUploading(true);
    try {
      const filePath = doc.file_url.split("/medical-history/")[1];
      if (!filePath) throw new Error("Invalid file path");
      const { data: fileData, error } = await supabase.storage.from("medical-history").download(filePath);
      if (error) throw error;

      let ocrText = "";
      if (filePath.endsWith(".pdf")) {
        ocrText = await ocrPdf(new File([fileData], filePath));
      } else {
        ocrText = await ocrImage(new File([fileData], filePath));
      }

      const { data: summaryData } = await supabase.functions.invoke(
        "process-medical-history",
        { body: { patientId, ocrText, patientName } }
      );

      await supabase
        .from("medical_history_documents")
        .update({ summary: summaryData?.summary || ocrText, ocr_text: ocrText })
        .eq("id", doc.id);

      toast({ title: "Summary regenerated" });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const getTypeLabel = (type: string) =>
    DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      discharge_summary: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      surgical_notes: "bg-red-500/10 text-red-500 border-red-500/20",
      lab_history: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      imaging: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      prescription_history: "bg-green-500/10 text-green-500 border-green-500/20",
      referral: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    };
    return colors[type] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <>
      <Card className="glass border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Medical History
            </CardTitle>
            <CardDescription>
              Upload and manage patient's medical history documents
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUploadForm(!showUploadForm)}
            disabled={uploading}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Document
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Form */}
          {showUploadForm && (
            <div className="border border-border/60 rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Document Date</Label>
                  <Input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div
                className="border-2 border-dashed border-border/60 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-medium">Select File</p>
                    <p className="text-xs text-muted-foreground">PDF, JPEG, PNG • Max 20MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowUploadForm(false); setSelectedFile(null); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Upload & Analyze
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm font-medium text-primary">{uploadProgress}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && documents.length === 0 && !showUploadForm && (
            <div className="flex flex-col items-center py-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No medical history documents uploaded yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowUploadForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Upload First Document
              </Button>
            </div>
          )}

          {/* Timeline */}
          {!loading && documents.length > 0 && (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border/60" />

              {documents.map((doc, idx) => (
                <div key={doc.id} className="relative pl-10 pb-4">
                  {/* Timeline dot */}
                  <div className="absolute left-[11px] top-2 w-[10px] h-[10px] rounded-full bg-primary border-2 border-background" />

                  <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50 hover:bg-card/80 transition-colors">
                    {/* Header row */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {doc.document_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(doc.document_date).toLocaleDateString()}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTypeColor(doc.document_type)}`}>
                            {getTypeLabel(doc.document_type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleViewFile(doc); }}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {(userRole === "doctor" || userRole === "admin") && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id, doc.file_url); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {expandedDoc === doc.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded summary */}
                    {expandedDoc === doc.id && (
                      <div className="border-t border-border/50 p-3 space-y-2">
                        {doc.summary ? (
                          <ScrollArea className="max-h-[300px]">
                            <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold text-primary">OCR Summary</span>
                              </div>
                              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/85">
                                {doc.summary}
                              </pre>
                            </div>
                          </ScrollArea>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">No summary generated.</p>
                        )}
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleReprocess(doc)} disabled={uploading}>
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            Re-analyze
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => { setShowPreview(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        >
          <div
            className="bg-background rounded-lg max-w-4xl max-h-[90vh] w-full overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Medical History - {patientName}</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowPreview(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
                Close
              </Button>
            </div>
            {previewFileName?.endsWith(".pdf") ? (
              <iframe src={previewUrl} className="w-full h-[75vh] rounded border" />
            ) : (
              <img src={previewUrl} alt="Medical History" className="max-w-full rounded" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
