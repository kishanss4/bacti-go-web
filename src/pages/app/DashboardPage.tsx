import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Activity,
  Plus,
  AlertTriangle,
  Clock,
  Stethoscope,
  ClipboardList,
  Pill,
  UserPlus,
  Upload,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { useProfileNames } from "@/hooks/useProfileNames";

interface RecentItem {
  id: string;
  type: "patient" | "lab_report" | "prescription";
  title: string;
  subtitle: string;
  timestamp: string;
  userId: string;
  link: string;
}

export default function DashboardPage() {
  const { user, userRole } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activePatients: 0,
    pendingReports: 0,
    criticalCases: 0,
    prescriptionsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Collect user IDs from recent activity for name resolution
  const profileNames = useProfileNames(recentItems.map((r) => r.userId));

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: patientsCount } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        const { count: pendingReports } = await supabase
          .from("lab_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const { count: criticalCases } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("has_septic_shock", true)
          .eq("status", "active");

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: prescriptionsToday } = await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString());

        setStats({
          activePatients: patientsCount || 0,
          pendingReports: pendingReports || 0,
          criticalCases: criticalCases || 0,
          prescriptionsToday: prescriptionsToday || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentActivity = async () => {
      try {
        const items: RecentItem[] = [];

        // Recent patients
        const { data: patients } = await supabase
          .from("patients")
          .select("id, full_name, created_at, created_by, ward")
          .order("created_at", { ascending: false })
          .limit(5);

        patients?.forEach((p) =>
          items.push({
            id: p.id,
            type: "patient",
            title: `Patient added: ${p.full_name}`,
            subtitle: p.ward ? `Ward ${p.ward}` : "No ward assigned",
            timestamp: p.created_at,
            userId: p.created_by,
            link: `/patients/${p.id}`,
          })
        );

        // Recent lab reports
        const { data: reports } = await supabase
          .from("lab_reports")
          .select("id, report_type, specimen_type, created_at, uploaded_by, patient_id, patients(full_name)")
          .order("created_at", { ascending: false })
          .limit(5);

        reports?.forEach((r: any) =>
          items.push({
            id: r.id,
            type: "lab_report",
            title: `Lab report: ${r.report_type}`,
            subtitle: `${r.patients?.full_name || "Unknown"} • ${r.specimen_type || ""}`,
            timestamp: r.created_at,
            userId: r.uploaded_by,
            link: `/lab-reports/${r.id}`,
          })
        );

        // Recent prescriptions
        const { data: rxs } = await supabase
          .from("prescriptions")
          .select("id, antibiotic_name, dose, created_at, prescribed_by, patient_id, patients(full_name)")
          .order("created_at", { ascending: false })
          .limit(5);

        rxs?.forEach((rx: any) =>
          items.push({
            id: rx.id,
            type: "prescription",
            title: `Prescribed: ${rx.antibiotic_name}`,
            subtitle: `${rx.patients?.full_name || "Unknown"} • ${rx.dose}`,
            timestamp: rx.created_at,
            userId: rx.prescribed_by,
            link: `/prescriptions/${rx.id}`,
          })
        );

        // Sort by timestamp descending and take top 10
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentItems(items.slice(0, 10));
      } catch (error) {
        console.error("Error fetching recent activity:", error);
      }
    };

    fetchStats();
    fetchRecentActivity();
  }, []);

  const statCards = [
    { label: "Active Patients", value: stats.activePatients, icon: Users, color: "text-primary" },
    { label: "Pending Reports", value: stats.pendingReports, icon: FileText, color: "text-warning" },
    { label: "Critical Cases", value: stats.criticalCases, icon: AlertTriangle, color: "text-destructive" },
    { label: "Prescriptions Today", value: stats.prescriptionsToday, icon: Activity, color: "text-success" },
  ];

  const quickActions = [
    { label: "New Patient", icon: Plus, href: "/patients/new", primary: true },
    { label: "View Patients", icon: Users, href: "/patients" },
    { label: "Lab Reports", icon: FileText, href: "/lab-reports" },
    { label: "Prescriptions", icon: ClipboardList, href: "/prescriptions" },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "patient": return <UserPlus className="w-4 h-4 text-primary" />;
      case "lab_report": return <Upload className="w-4 h-4 text-warning" />;
      case "prescription": return <Pill className="w-4 h-4 text-success" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "Doctor"}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's your clinical overview for today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "-" : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks and navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant={action.primary ? "default" : "secondary"}
                className={`h-auto py-4 flex flex-col gap-2 ${action.primary ? "gradient-primary" : ""}`}
                onClick={() => navigate(action.href)}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role-specific content */}
      {userRole === "doctor" && (
        <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Physician Dashboard
            </CardTitle>
            <CardDescription>Prescriptions requiring your review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No pending prescriptions</p>
              <p className="text-xs text-muted-foreground mt-1">
                All caught up!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest clinical actions across the system</CardDescription>
        </CardHeader>
        <CardContent>
          {recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start by adding a new patient
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(item.link)}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle} • by {profileNames[item.userId] || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {getTimeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical Reminder */}
      <Card className="border-primary/30 bg-primary/5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Clinical Reminder</p>
            <p className="text-xs text-muted-foreground mt-1">
              This is a decision-support tool. Final clinical judgment rests with the treating physician.
              Always verify recommendations against current hospital guidelines.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
