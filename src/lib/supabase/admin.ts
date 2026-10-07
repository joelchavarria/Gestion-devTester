import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Server-only client for operational mutations. Never import this module from a
 * client component: the service-role secret deliberately bypasses RLS after the
 * request has been authenticated and authorized by the API layer.
 */
export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || serviceRoleKey.startsWith("replace_with")) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para ejecutar operaciones seguras.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
