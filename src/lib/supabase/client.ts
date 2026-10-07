"use client";

import { createBrowserClient } from "@supabase/ssr";

function getPublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("replace_with")) {
    throw new Error("Supabase local todavía no está configurado. Ejecuta npm run db:up y completa .env.local.");
  }
  return { url, key };
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, key } = getPublicConfig();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
