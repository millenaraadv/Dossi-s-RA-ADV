import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Bucket privado (autos podem conter dados sensíveis de cliente — LGPD).
// Criado uma vez via script; ver drizzle/seed.ts para o padrão de scripts
// administrativos avulsos deste projeto.
const BUCKET = "autos";

export async function uploadAuto(storageKey: string, bytes: Buffer, contentType: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(storageKey, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Falha ao salvar o arquivo: ${error.message}`);
}

export async function downloadAuto(storageKey: string): Promise<Buffer> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(storageKey);
  if (error) throw new Error(`Falha ao ler o arquivo: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}
