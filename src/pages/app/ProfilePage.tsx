import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { ArrowLeft, Camera, Loader2, Mail, Shield, User, Building } from "lucide-react";

const departments = [
  "Internal Medicine",
  "Infectious Disease",
  "Emergency Medicine",
  "ICU/Critical Care",
  "Pulmonology",
  "Surgery",
  "Pediatrics",
  "Pharmacy",
  "Microbiology Lab",
  "Nursing",
  "Administration",
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    department: "",
    avatar_url: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          department: data.department || "",
          avatar_url: data.avatar_url || "",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        department: profile.department,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingAvatar(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("lab-reports")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: "Could not upload avatar. Please try again.",
        variant: "destructive",
      });
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("lab-reports")
      .getPublicUrl(fileName);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update avatar. Please try again.",
        variant: "destructive",
      });
    } else {
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });
    }
    setUploadingAvatar(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "admin": return "destructive";
      case "doctor": return "default";
      case "nurse": return "secondary";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="glass">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(profile.full_name || "U")}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div className="flex-1">
              <CardTitle className="text-xl">{profile.full_name || "No Name Set"}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {profile.email}
              </CardDescription>
              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Badge variant={getRoleBadgeVariant(userRole)} className="capitalize">
                  {userRole || "No Role"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Edit Form */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Department
            </Label>
            <Select
              value={profile.department}
              onValueChange={(value) => setProfile(prev => ({ ...prev, department: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">User ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{user?.id?.slice(0, 8)}...</code>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Role</span>
              <Badge variant={getRoleBadgeVariant(userRole)} className="capitalize">
                {userRole || "Pending Assignment"}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Account Created</span>
              <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
