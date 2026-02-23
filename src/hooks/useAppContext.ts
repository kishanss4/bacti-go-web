import { useOutletContext } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AppContext {
  user: any;
  userRole: AppRole | null;
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}
