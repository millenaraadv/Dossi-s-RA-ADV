import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client com a service role key: bypassa RLS, usado só em código de servidor
 * (seed, storage privado dos autos, gestão de usuários). Nunca importar de
 * um componente cliente.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
