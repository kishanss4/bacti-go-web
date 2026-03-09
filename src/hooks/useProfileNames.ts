import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileInfo {
  name: string;
  role: string | null;
  display: string;
}

/**
 * Given a list of user UUIDs, resolves them to display names + roles.
 * Returns a map of userId → "Dr. Name (Doctor)" style display string.
 */
export function useProfileNames(userIds: (string | null | undefined)[]) {
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const unique = [...new Set(userIds.filter(Boolean) as string[])];
    if (unique.length === 0) return;

    const missing = unique.filter((id) => !profiles[id]);
    if (missing.length === 0) return;

    const fetchProfiles = async () => {
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", missing),
        supabase.from("user_roles").select("user_id, role").in("user_id", missing),
      ]);

      const roleMap: Record<string, string> = {};
      roleData?.forEach((r) => {
        roleMap[r.user_id] = r.role;
      });

      setProfiles((prev) => {
        const next = { ...prev };
        profileData?.forEach((p) => {
          const name = p.full_name || "Unknown";
          const role = roleMap[p.id];
          const roleLabel =
            role === "doctor" ? "Doctor" : role === "nurse" ? "Nurse" : role === "admin" ? "Admin" : null;
          next[p.id] = roleLabel ? `${name} (${roleLabel})` : name;
        });
        return next;
      });
    };

    fetchProfiles();
  }, [userIds.filter(Boolean).sort().join(",")]);

  return profiles;
}
