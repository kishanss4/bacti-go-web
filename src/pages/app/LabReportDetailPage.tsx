import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Tesseract from "tesseract.js";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames } from "@/hooks/useProfileNames";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText, Loader2, ArrowLeft, AlertTriangle, CheckCircle2, Pill, User,
  Calendar, FlaskConical, Microscope, ShieldAlert, Download, Eye, FileImage,
  ClipboardList, Sparkles, RefreshCw, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { pdfFirstPageToBlob } from "@/lib/pdfToImage";
import PdfCanvasPreview from "@/components/PdfCanvasPreview";
import type { Database } from "@/integrations/supabase/types";

type LabReport = Database["public"]["Tables"]["lab_reports"]["Row"];
type Patient = Database["public"]["Tables"]["patients"]["Row"];

interface Sensitivity {
  organism: string;
  antibiotic: string;
  result: "S" | "R" | "I";
}

interface Organism {
  name: string;
}

export default function LabReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<LabReport | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [showFullImage, setShowFullImage] = useState(false);
  const [runningOcr, setRunningOcr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const profileNames = useProfileNames([report?.uploaded_by, report?.reviewed_by]);

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  // Get the storage path for Supabase download API
  const getStoragePath = () => {
    if (!report?.file_url) return null;
    if (report.file_url.startsWith("http")) {
      // Extract path from full URL
      const match = report.file_url.match(/\/lab-reports\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    }
    return report.file_url;
  };

  // Download file blob using Supabase client (bypasses Brave/ad-blocker)
  const downloadBlob = async (): Promise<Blob | null> => {
    const storagePath = getStoragePath();
    if (!storagePath) return null;
    const { data, error } = await supabase.storage.from("lab-reports").download(storagePath);
    if (error) {
      console.error("Download error:", error);
      return null;
    }
    return data;
  };

  // Fetch PDF as blob for canvas preview
  useEffect(() => {
    if (report?.file_url && isPdfFile()) {
      downloadBlob().then(blob => {
        if (blob) {
          setPdfBlob(blob);
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        }
      });
    }
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [report?.file_url]);

  const fetchReport = async () => {
    try {
      const { data: reportData, error } = await supabase
        .from("lab_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setReport(reportData);
      setDoctorNotes(reportData.doctor_notes || "");
      setStatus(reportData.status || "pending");

      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", reportData.patient_id)
        .single();

      setPatient(patientData);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      toast({ title: "Error", description: "Failed to load lab report", variant: "destructive" });
      navigate("/lab-reports");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("lab_reports")
        .update({ doctor_notes: doctorNotes, status, reviewed_by: user.id })
        .eq("id", report.id);

      if (error) throw error;
      toast({ title: "Report updated", description: "Your review has been saved." });
      fetchReport();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save review", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!report) return;
    setDeleting(true);
    try {
      // Delete file from storage if exists
      if (report.file_url && !report.file_url.startsWith("http")) {
        await supabase.storage.from("lab-reports").remove([report.file_url]);
      }
      const { error } = await supabase.from("lab_reports").delete().eq("id", report.id);
      if (error) throw error;
      toast({ title: "Report deleted", description: "Lab report has been permanently deleted." });
      navigate("/lab-reports");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete report", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteEvidence = async () => {
    if (!report?.file_url) return;
    setDeleting(true);
    try {
      // Extract storage path from URL
      const storagePath = report.file_url.startsWith("http")
        ? report.file_url.split("/lab-reports/").pop() || ""
        : report.file_url;

      if (storagePath) {
        await supabase.storage.from("lab-reports").remove([decodeURIComponent(storagePath)]);
      }

      const { error } = await supabase
        .from("lab_reports")
        .update({ file_url: null, file_name: null })
        .eq("id", report.id);

      if (error) throw error;
      toast({ title: "Evidence deleted", description: "Uploaded file has been removed." });
      fetchReport();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete evidence", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const getFileUrl = () => {
    if (!report?.file_url) return null;
    if (report.file_url.startsWith("http")) return report.file_url;
    const { data } = supabase.storage.from("lab-reports").getPublicUrl(report.file_url);
    return data?.publicUrl || null;
  };

  const isImageFile = () => {
    if (!report?.file_name) return false;
    const ext = report.file_name.toLowerCase().split(".").pop();
    return ["jpg", "jpeg", "png", "webp"].includes(ext || "");
  };

  const isPdfFile = () => {
    if (!report?.file_name) return false;
    return report.file_name.toLowerCase().endsWith(".pdf");
  };

  const canRunOcr = () => {
    return report?.file_url && (isImageFile() || isPdfFile());
  };

  const handleRunOcr = async () => {
    setRunningOcr(true);
    try {
      const blob = await downloadBlob();
      if (!blob) throw new Error("No file available");

      let ocrInput: Blob = blob;

      // If PDF, convert first page to image
      if (isPdfFile()) {
        ocrInput = await pdfFirstPageToBlob(blob);
      }

      const { data: ocrData } = await Tesseract.recognize(ocrInput, "eng");
      const extractedText = ocrData?.text || "";

      if (!extractedText.trim()) {
        toast({ title: "OCR Failed", description: "Could not extract text from the file", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("process-lab-ocr", {
        body: { labReportId: report!.id, ocrText: extractedText },
      });

      if (error) throw error;

      toast({
        title: "OCR Complete",
        description: `Found ${data?.result?.organisms?.length || 0} organisms and ${data?.result?.sensitivities?.length || 0} sensitivities`,
      });

      fetchReport();
    } catch (err: any) {
      console.error("OCR error:", err);
      toast({ title: "OCR Failed", description: err.message || "Failed to process report", variant: "destructive" });
    } finally {
      setRunningOcr(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Report not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/lab-reports")}>
          Back to Lab Reports
        </Button>
      </div>
    );
  }

  const organisms = (report.organisms as unknown as Organism[]) || [];
  const sensitivities = (report.sensitivities as unknown as Sensitivity[]) || [];
  const fileUrl = getFileUrl();
  const canDelete = userRole === "doctor" || userRole === "admin";

  const sensitivityByOrganism = organisms.map((org) => ({
    name: org.name,
    sensitivities: sensitivities.filter((s) => s.organism === org.name),
  }));

  const statusColors: Record<string, string> = {
    pending: "bg-warning/20 text-warning border-warning/30",
    reviewed: "bg-primary/20 text-primary border-primary/30",
    confirmed: "bg-success/20 text-success border-success/30",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {report.report_type}
            </h1>
            <Badge className={statusColors[report.status || "pending"]} variant="outline">
              {report.status}
            </Badge>
            {report.is_mdr && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                MDR Pathogen
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {report.specimen_type} • Collected{" "}
            {report.specimen_date ? new Date(report.specimen_date).toLocaleDateString() : "Date unknown"}
          </p>
        </div>
        <div className="flex gap-2">
          {userRole === "doctor" && (
            <Button
              className="gradient-primary"
              onClick={() => navigate(`/prescriptions/new?patient=${report.patient_id}&report=${report.id}`)}
            >
              <Pill className="w-4 h-4 mr-2" />
              Prescribe
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lab Report</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this lab report and its uploaded evidence. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleDeleteReport}
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Delete Report
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Patient Info */}
      {patient && (
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{patient.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {patient.age}y {patient.gender} • {patient.patient_id || "No ID"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${patient.id}`)}>
                View Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Specimen Type</p>
              <p className="font-medium">{report.specimen_type || "Not specified"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Report Date</p>
              <p className="font-medium">{new Date(report.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Microscope className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Organisms Isolated</p>
              <p className="font-medium">{organisms.length} organism(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accountability Info */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Uploaded By</p>
              <p className="font-medium">{profileNames[report.uploaded_by] || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</p>
            </div>
            {report.reviewed_by && (
              <div>
                <p className="text-xs text-muted-foreground">Reviewed By</p>
                <p className="font-medium">{profileNames[report.reviewed_by] || "Unknown"}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{report.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {(fileUrl || report.file_name) && (
        <Card className="glass border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-primary" />
                  Uploaded Evidence
                </CardTitle>
                <CardDescription>Original lab report document uploaded by clinical staff</CardDescription>
              </div>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Evidence
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Evidence</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the uploaded file. The lab report data will be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleDeleteEvidence}
                        disabled={deleting}
                      >
                        Delete Evidence
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fileUrl && isImageFile() && (
              <div className="space-y-3">
                <div
                  className={`relative rounded-lg overflow-hidden border border-border cursor-pointer transition-all ${
                    showFullImage ? "max-h-none" : "max-h-64"
                  }`}
                  onClick={() => setShowFullImage(!showFullImage)}
                >
                  <img src={fileUrl} alt="Lab report" className="w-full object-contain" />
                  {!showFullImage && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2">
                      <span className="text-xs text-muted-foreground">Click to expand</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {isPdfFile() && pdfBlob && (
              <PdfCanvasPreview blob={pdfBlob} />
            )}
            {isPdfFile() && !pdfBlob && report.file_url && (
              <div className="rounded-lg border border-border p-8 flex flex-col items-center justify-center gap-3 bg-muted/30 min-h-[200px]">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading PDF preview...</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{report.file_name || "Uploaded file"}</span>
              {report.file_url && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      const blob = await downloadBlob();
                      if (!blob) throw new Error("Download failed");
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 60000);
                    } catch {
                      toast({ title: "Error", description: "Could not open file", variant: "destructive" });
                    }
                  }}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      const blob = await downloadBlob();
                      if (!blob) throw new Error("Download failed");
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = report.file_name || "lab-report";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setTimeout(() => URL.revokeObjectURL(url), 10000);
                    } catch {
                      toast({ title: "Error", description: "Could not download file", variant: "destructive" });
                    }
                  }}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Summary */}
      <Card className={report.medical_summary ? "border-primary/30 bg-primary/5" : "glass border-border/50"}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            AI-Generated Medical Summary
          </CardTitle>
          <CardDescription>
            {report.medical_summary
              ? "Auto-generated from OCR text extraction — always verify against original document"
              : "No summary available yet — run OCR on the uploaded report to generate one"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.medical_summary ? (
            <pre className="whitespace-pre-wrap text-sm font-mono bg-background/50 p-4 rounded-lg border border-border leading-relaxed">
              {report.medical_summary}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-1">No AI summary generated</p>
              <p className="text-xs text-muted-foreground mb-4">
                {canRunOcr()
                  ? "Click below to run OCR and generate a clinical summary from the uploaded file"
                  : "Upload an image or PDF of the lab report to enable OCR-based summary generation"}
              </p>
              {canRunOcr() && (
                <Button variant="outline" className="gap-2" disabled={runningOcr} onClick={handleRunOcr}>
                  {runningOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {runningOcr ? "Processing OCR..." : "Run OCR Analysis"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MDR Alert */}
      {report.is_mdr && report.mdr_type && report.mdr_type.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Multi-Drug Resistant Pathogen Detected</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {report.mdr_type.map((type, i) => (
                  <Badge key={i} variant="destructive">{type}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Infection control measures may be required. Consider ID consultation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organisms & Sensitivities */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            Culture Results
          </CardTitle>
          <CardDescription>Isolated organisms and antibiotic sensitivities</CardDescription>
        </CardHeader>
        <CardContent>
          {organisms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Microscope className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No organisms recorded</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sensitivityByOrganism.map((org, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h4 className="font-semibold text-lg">{org.name}</h4>
                  </div>
                  {org.sensitivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-4">No sensitivity data available</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pl-4">
                      {org.sensitivities.map((s, j) => (
                        <div
                          key={j}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            s.result === "S"
                              ? "bg-success/10 border-success/30"
                              : s.result === "R"
                              ? "bg-destructive/10 border-destructive/30"
                              : "bg-warning/10 border-warning/30"
                          }`}
                        >
                          <span className="text-sm font-medium truncate">{s.antibiotic}</span>
                          <Badge
                            variant={s.result === "S" ? "default" : s.result === "R" ? "destructive" : "secondary"}
                            className={s.result === "S" ? "bg-success" : ""}
                          >
                            {s.result}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-4 pt-4 border-t border-border text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-success">S</Badge>
                  <span className="text-muted-foreground">Sensitive</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">I</Badge>
                  <span className="text-muted-foreground">Intermediate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">R</Badge>
                  <span className="text-muted-foreground">Resistant</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Review Section */}
      {userRole === "doctor" && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Doctor Review
            </CardTitle>
            <CardDescription>Add clinical notes and update report status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Add clinical interpretation, recommendations, or follow-up notes..."
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveReview} disabled={saving} className="gradient-primary">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Notes (for non-doctors) */}
      {report.doctor_notes && userRole !== "doctor" && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Doctor's Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.doctor_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
