import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText, Search, Loader2, ChevronRight, ChevronDown, AlertTriangle,
  Upload, User, ClipboardList, Sparkles, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { useProfileNames } from "@/hooks/useProfileNames";
import type { Database } from "@/integrations/supabase/types";

type LabReport = Database["public"]["Tables"]["lab_reports"]["Row"];

interface LabReportWithPatient extends LabReport {
  patients?: { full_name: string; patient_id: string | null };
}

export default function LabReportsPage() {
  const { userRole } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<LabReportWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const profileNames = useProfileNames(reports.map((r) => r.uploaded_by));
  const canDelete = userRole === "doctor" || userRole === "admin";

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("lab_reports")
        .select(`
          *,
          patients (full_name, patient_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching lab reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.patients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.patients?.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.specimen_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(reportId);
    try {
      const report = reports.find(r => r.id === reportId);
      if (report?.file_url) {
        const storagePath = report.file_url.startsWith("http")
          ? report.file_url.split("/lab-reports/").pop() || ""
          : report.file_url;
        if (storagePath) {
          await supabase.storage.from("lab-reports").remove([decodeURIComponent(storagePath)]);
        }
      }
      const { error } = await supabase.from("lab_reports").delete().eq("id", reportId);
      if (error) throw error;
      setReports(reports.filter(r => r.id !== reportId));
      toast({ title: "Report deleted", description: "Lab report has been permanently deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete report", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const truncateSummary = (summary: string, maxLines = 4) => {
    const lines = summary.split("\n").filter((l) => l.trim());
    if (lines.length <= maxLines) return summary;
    return lines.slice(0, maxLines).join("\n") + "\n...";
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Lab Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Culture and sensitivity results
          </p>
        </div>
        <Button
          className="gradient-primary"
          onClick={() => navigate("/lab-reports/new")}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Report
        </Button>
      </div>

      {/* Search */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, report type, or specimen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Lab Report List</CardTitle>
          <CardDescription>
            {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No lab reports found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "Upload your first lab report"}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4 gradient-primary"
                  onClick={() => navigate("/lab-reports/new")}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Report
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-10"></TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Specimen</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <Collapsible
                      key={report.id}
                      open={expandedReportId === report.id}
                      asChild
                    >
                      <>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/lab-reports/${report.id}`)}
                        >
                          <TableCell className="px-2">
                            {report.medical_summary ? (
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => toggleExpand(report.id, e)}
                                >
                                  {expandedReportId === report.id ? (
                                    <ChevronDown className="w-4 h-4 text-primary" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 text-primary" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            ) : (
                              <div className="h-7 w-7" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {report.patients?.full_name || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {report.patients?.patient_id || "-"}
                                </p>
                              </div>
                              {report.is_mdr && (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {report.report_type}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {report.specimen_type || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {profileNames[report.uploaded_by] || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                report.status === "reviewed"
                                  ? "success"
                                  : report.status === "pending"
                                  ? "warning"
                                  : "outline"
                              }
                            >
                              {report.status?.charAt(0).toUpperCase() + report.status?.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {canDelete && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Lab Report</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this lab report and its uploaded evidence. This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        disabled={deletingId === report.id}
                                        onClick={(e) => handleDelete(report.id, e)}
                                      >
                                        {deletingId === report.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : null}
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="px-6 py-4 bg-primary/5 border-t border-b border-primary/20">
                                <div className="flex items-start gap-3">
                                  <ClipboardList className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-primary mb-2">
                                      AI-Generated Medical Summary
                                    </p>
                                    <pre className="whitespace-pre-wrap text-xs font-mono text-foreground/80 bg-background/50 p-3 rounded-lg border border-border leading-relaxed">
                                      {report.medical_summary}
                                    </pre>
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="mt-2 p-0 h-auto text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/lab-reports/${report.id}`);
                                      }}
                                    >
                                      View full report →
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
