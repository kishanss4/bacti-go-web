import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Upload,
  User,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import type { Database } from "@/integrations/supabase/types";

type LabReport = Database["public"]["Tables"]["lab_reports"]["Row"];

interface LabReportWithPatient extends LabReport {
  patients?: { full_name: string; patient_id: string | null };
}

export default function LabReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<LabReportWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
                    <TableHead>Patient</TableHead>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Specimen</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/lab-reports/${report.id}`)}
                    >
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
                      <TableCell className="text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            report.status === "reviewed"
                              ? "default"
                              : report.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                          className={report.status === "reviewed" ? "bg-success" : ""}
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
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
