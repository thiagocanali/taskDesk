import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const localMode = import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === "local";
export const authClient = url && key?.startsWith("sb_publishable_") ? createClient(url, key, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
}) : null;

export async function accessToken(): Promise<string | null> {
  if (!authClient) return null;
  const { data, error } = await authClient.auth.getSession();
  if (error || !data.session) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.session.access_token;
}
