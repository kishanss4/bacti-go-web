import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Pill,
  Users,
  Download,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/exportCsv";

interface AnalyticsData {
  prescriptionStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  antibioticUsage: { name: string; count: number }[];
  mdrStats: { name: string; value: number }[];
  patientTypeDistribution: { name: string; value: number; color: string }[];
  monthlyTrends: { month: string; prescriptions: number; mdr: number }[];
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(142 76% 36%)",
  warning: "hsl(38 92% 50%)",
  danger: "hsl(0 84% 60%)",
  muted: "hsl(var(--muted-foreground))",
};

const PATIENT_TYPE_COLORS = [
  "hsl(142 76% 36%)",  // type_1 - green
  "hsl(38 92% 50%)",   // type_2 - yellow
  "hsl(25 95% 53%)",   // type_3 - orange
  "hsl(0 84% 60%)",    // type_4 - red
];

export default function AnalyticsPage() {
  const { userRole } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch prescription stats
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("status, antibiotic_name, antibiotic_class, created_at");

      const prescriptionStats = {
        total: prescriptions?.length || 0,
        pending: prescriptions?.filter(p => p.status === "pending").length || 0,
        approved: prescriptions?.filter(p => p.status === "approved").length || 0,
        rejected: prescriptions?.filter(p => p.status === "rejected").length || 0,
        completed: prescriptions?.filter(p => p.status === "completed").length || 0,
      };

      // Antibiotic usage counts
      const antibioticCounts = prescriptions?.reduce((acc: Record<string, number>, p) => {
        const name = p.antibiotic_name;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {}) || {};

      const antibioticUsage = Object.entries(antibioticCounts)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Fetch MDR stats from lab reports
      const { data: labReports } = await supabase
        .from("lab_reports")
        .select("is_mdr, mdr_type");

      const mdrCount = labReports?.filter(r => r.is_mdr).length || 0;
      const nonMdrCount = (labReports?.length || 0) - mdrCount;

      const mdrStats = [
        { name: "MDR Pathogens", value: mdrCount },
        { name: "Non-MDR", value: nonMdrCount },
      ];

      // Fetch patient type distribution
      const { data: patients } = await supabase
        .from("patients")
        .select("patient_type");

      const patientTypeCounts = patients?.reduce((acc: Record<string, number>, p) => {
        const type = p.patient_type || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};

      const patientTypeDistribution = [
        { name: "Type 1 (Low Risk)", value: patientTypeCounts["type_1"] || 0, color: PATIENT_TYPE_COLORS[0] },
        { name: "Type 2 (Moderate)", value: patientTypeCounts["type_2"] || 0, color: PATIENT_TYPE_COLORS[1] },
        { name: "Type 3 (High Risk)", value: patientTypeCounts["type_3"] || 0, color: PATIENT_TYPE_COLORS[2] },
        { name: "Type 4 (Critical)", value: patientTypeCounts["type_4"] || 0, color: PATIENT_TYPE_COLORS[3] },
      ];

      // Monthly trends (last 6 months)
      const monthlyTrends = generateMonthlyTrends(prescriptions || [], labReports || []);

      setData({
        prescriptionStats,
        antibioticUsage,
        mdrStats,
        patientTypeDistribution,
        monthlyTrends,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyTrends = (prescriptions: any[], labReports: any[]) => {
    const months: { month: string; prescriptions: number; mdr: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const prescriptionCount = prescriptions.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      const mdrCount = labReports.filter(r => {
        if (!r.is_mdr) return false;
        const createdAt = new Date(r.created_at || Date.now());
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      months.push({ month: monthStr, prescriptions: prescriptionCount, mdr: mdrCount });
    }

    return months;
  };

  if (userRole !== "admin") {
    return (
      <div className="p-6">
        <Card className="glass border-border/50">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Analytics dashboard is only available to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Activity className="w-7 h-7 text-primary" />
            Stewardship Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor antibiotic usage patterns and stewardship outcomes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Export all analytics data
            const rows: Record<string, any>[] = [];
            
            // Prescription stats
            rows.push({
              Section: "Prescription Stats",
              Metric: "Total",
              Value: data?.prescriptionStats.total,
            });
            rows.push({ Section: "Prescription Stats", Metric: "Pending", Value: data?.prescriptionStats.pending });
            rows.push({ Section: "Prescription Stats", Metric: "Approved", Value: data?.prescriptionStats.approved });
            rows.push({ Section: "Prescription Stats", Metric: "Rejected", Value: data?.prescriptionStats.rejected });
            rows.push({ Section: "Prescription Stats", Metric: "Completed", Value: data?.prescriptionStats.completed });

            // Antibiotic usage
            data?.antibioticUsage.forEach((a) =>
              rows.push({ Section: "Antibiotic Usage", Metric: a.name, Value: a.count })
            );

            // MDR stats
            data?.mdrStats.forEach((m) =>
              rows.push({ Section: "MDR Analysis", Metric: m.name, Value: m.value })
            );

            // Patient types
            data?.patientTypeDistribution.forEach((p) =>
              rows.push({ Section: "Patient Risk", Metric: p.name, Value: p.value })
            );

            // Monthly trends
            data?.monthlyTrends.forEach((m) => {
              rows.push({ Section: "Monthly Trends", Metric: `${m.month} - Prescriptions`, Value: m.prescriptions });
              rows.push({ Section: "Monthly Trends", Metric: `${m.month} - MDR`, Value: m.mdr });
            });

            exportToCsv("analytics_export", rows);
          }}
        >
          <Download className="w-4 h-4 mr-1" />
          Export All Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Prescriptions</p>
                <p className="text-2xl font-bold text-foreground">{data?.prescriptionStats.total}</p>
              </div>
              <Pill className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-warning">{data?.prescriptionStats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-500">{data?.prescriptionStats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejection Rate</p>
                <p className="text-2xl font-bold text-destructive">
                  {data?.prescriptionStats.total 
                    ? Math.round((data.prescriptionStats.rejected / data.prescriptionStats.total) * 100) 
                    : 0}%
                </p>
              </div>
              <XCircle className="w-8 h-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="usage">Antibiotic Usage</TabsTrigger>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="patients">Patient Risk</TabsTrigger>
          <TabsTrigger value="mdr">MDR Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Top Prescribed Antibiotics</CardTitle>
              <CardDescription>Most frequently prescribed antibiotics in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.antibioticUsage} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={90} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Monthly Prescription Trends</CardTitle>
              <CardDescription>Prescription volume and MDR cases over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="prescriptions" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mdr" 
                      stroke="hsl(0 84% 60%)" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(0 84% 60%)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Patient Risk Distribution</CardTitle>
              <CardDescription>Breakdown of patients by risk classification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.patientTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {data?.patientTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {data?.patientTypeDistribution.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-muted-foreground">{entry.name}</span>
                    <Badge variant="secondary">{entry.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mdr">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>MDR Pathogen Analysis</CardTitle>
              <CardDescription>Multi-drug resistant organism detection rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.mdrStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="hsl(0 84% 60%)" />
                      <Cell fill="hsl(142 76% 36%)" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-8 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm text-muted-foreground">MDR Pathogens</span>
                  <Badge variant="destructive">{data?.mdrStats[0]?.value || 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Non-MDR</span>
                  <Badge className="bg-green-500">{data?.mdrStats[1]?.value || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}