import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Pill, 
  Users, 
  FileText, 
  Activity, 
  LogOut, 
  Plus, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Stethoscope
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      
      // Fetch actual user role from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setUserRole(roleData?.role || null);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Pill className="w-12 h-12 text-primary animate-pulse-ring" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Active Patients", value: "0", icon: Users, color: "text-primary" },
    { label: "Pending Reviews", value: "0", icon: FileText, color: "text-warning" },
    { label: "Critical Cases", value: "0", icon: AlertTriangle, color: "text-destructive" },
    { label: "Completed Today", value: "0", icon: Activity, color: "text-success" },
  ];

  const quickActions = [
    { label: "New Patient", icon: Plus, href: "/patients/new", primary: true },
    { label: "View Patients", icon: Users, href: "/patients" },
    { label: "Lab Reports", icon: FileText, href: "/reports" },
    { label: "Guidelines", icon: Stethoscope, href: "/guidelines" },
  ];

  return (
    <div className="dark min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Pill className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">BACTI-GO</h1>
              <p className="text-xs text-muted-foreground">Decision Support</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'No Role Assigned'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
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
          {stats.map((stat, index) => (
            <Card key={stat.label} className="glass border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
                  onClick={() => toast({ title: "Coming soon", description: `${action.label} feature will be available soon.` })}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

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
      </main>
    </div>
  );
};

export default Dashboard;
