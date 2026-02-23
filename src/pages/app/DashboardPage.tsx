import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Activity,
  Plus,
  AlertTriangle,
  Clock,
  Stethoscope,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch active patients count
        const { count: patientsCount } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        // Fetch pending lab reports
        const { count: pendingReports } = await supabase
          .from("lab_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Fetch critical cases (patients with septic shock)
        const { count: criticalCases } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("has_septic_shock", true)
          .eq("status", "active");

        // Fetch prescriptions created today
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

    fetchStats();
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
          <CardDescription>Your latest clinical actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start by adding a new patient
            </p>
          </div>
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
