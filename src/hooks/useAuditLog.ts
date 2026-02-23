import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "./useAppContext";

type AuditAction = "INSERT" | "UPDATE" | "DELETE" | "VIEW" | "EXPORT" | "LOGIN" | "LOGOUT";

interface AuditLogOptions {
  oldData?: Record<string, any>;
  ipAddress?: string;
}

export function useAuditLog() {
  const { user } = useAppContext();

  const logAction = useCallback(
    async (
      action: AuditAction,
      tableName: string,
      recordId?: string,
      newData?: Record<string, any>,
      options?: AuditLogOptions
    ) => {
      if (!user?.id) {
        console.warn("Cannot log audit action: No user logged in");
        return;
      }

      try {
        const { error } = await supabase.from("audit_log").insert({
          user_id: user.id,
          action,
          table_name: tableName,
          record_id: recordId || null,
          new_data: newData || null,
          old_data: options?.oldData || null,
          ip_address: options?.ipAddress || null,
        });

        if (error) {
          console.error("Failed to log audit action:", error);
        }
      } catch (err) {
        console.error("Audit log error:", err);
      }
    },
    [user?.id]
  );

  const logView = useCallback(
    (tableName: string, recordId: string) => {
      return logAction("VIEW", tableName, recordId);
    },
    [logAction]
  );

  const logExport = useCallback(
    (tableName: string, metadata?: Record<string, any>) => {
      return logAction("EXPORT", tableName, undefined, metadata);
    },
    [logAction]
  );

  return {
    logAction,
    logView,
    logExport,
  };
}
