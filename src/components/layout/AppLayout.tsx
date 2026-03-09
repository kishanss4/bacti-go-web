import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Pill,
  Users,
  FileText,
  Activity,
  LogOut,
  Plus,
  Stethoscope,
  Menu,
  Home,
  ClipboardList,
  AlertCircle,
  User,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type AppRole = Database["public"]["Enums"]["app_role"];

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "New Patient", href: "/patients/new", icon: Plus },
  { label: "Lab Reports", href: "/lab-reports", icon: FileText },
  { label: "Prescriptions", href: "/prescriptions", icon: ClipboardList },
  { label: "Guidelines", href: "/guidelines", icon: Stethoscope },
];

const adminNavItems: NavItem[] = [
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Admin Panel", href: "/admin", icon: AlertCircle },
];

const NavContent = ({
  currentPath,
  onNavigate,
  userRole,
}: {
  currentPath: string;
  onNavigate: (href: string) => void;
  userRole: AppRole | null;
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Pill className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">BACTI-GO</h1>
            <p className="text-xs text-muted-foreground">Antibiotic Stewardship</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.href || 
              (item.href !== "/dashboard" && currentPath.startsWith(item.href));
            
            return (
              <button
                key={item.href}
                className={cn(
                  "w-full flex items-center justify-start gap-3 h-11 px-3 rounded-md transition-colors",
                  "text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  isActive && "!bg-sidebar-primary !text-sidebar-primary-foreground font-medium"
                )}
                onClick={() => onNavigate(item.href)}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          
          {/* Admin section */}
          {userRole === "admin" && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {adminNavItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <button
                    key={item.href}
                    className={cn(
                      "w-full flex items-center justify-start gap-3 h-11 px-3 rounded-md transition-colors",
                      "text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      isActive && "!bg-sidebar-primary !text-sidebar-primary-foreground font-medium"
                    )}
                    onClick={() => onNavigate(item.href)}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Role Badge */}
      {userRole && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent">
            <User className="w-4 h-4 text-sidebar-primary" />
            <span className="text-sm text-sidebar-foreground capitalize">{userRole}</span>
          </div>
        </div>
      )}

      {!userRole && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-xs text-warning">No role assigned</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AppLayout() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUser(user);

      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(roleData?.role || null);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        navigate("/");
      } else if (event === "TOKEN_REFRESHED" && session) {
        setUser(session.user);
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

  const handleNavigate = (href: string) => {
    navigate(href);
    setMobileOpen(false);
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

  return (
    <div className="dark min-h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar flex-col shrink-0">
        <NavContent
          currentPath={location.pathname}
          onNavigate={handleNavigate}
          userRole={userRole}
        />
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header - with safe area for notched devices */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50 flex items-center px-4 gap-4 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 !bg-sidebar border-sidebar-border [&>button]:text-sidebar-foreground">
              <NavContent
                currentPath={location.pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
              />
            </SheetContent>
          </Sheet>

          {/* Page Title - Dynamic */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground lg:hidden">BACTI-GO</h1>
          </div>

          {/* Notifications & User Info */}
          <div className="flex items-center gap-2">
            <NotificationBell userId={user?.id} />
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-accent/10"
              onClick={() => navigate("/profile")}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">
                  {user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <User className="w-5 h-5 sm:hidden" />
            </Button>
            <button 
              className="p-2 rounded-md text-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              onClick={handleLogout} 
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <Outlet context={{ user, userRole }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border flex items-center justify-around h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { label: "Home", href: "/dashboard", icon: Home },
          { label: "Patients", href: "/patients", icon: Users },
          { label: "Reports", href: "/lab-reports", icon: FileText },
          { label: "Rx", href: "/prescriptions", icon: ClipboardList },
          { label: "Profile", href: "/profile", icon: User },
        ].map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/dashboard" && item.href !== "/profile" && location.pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
