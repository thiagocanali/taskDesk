import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";

export interface Identity { id: string; }
export type Authenticate = (request: Request) => Promise<Identity | null>;
export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

export class AuthenticationUnavailable extends Error {}

export function createAuthenticator(env: NodeJS.ProcessEnv = process.env): Authenticate {
  if (env.AUTH_MODE === "local") {
    if (env.NODE_ENV !== "development" || env.VERCEL) {
      throw new Error("Local authentication is allowed only in local development.");
    }
    return async () => ({ id: LOCAL_USER_ID });
  }
  if (env.AUTH_MODE && env.AUTH_MODE !== "supabase") throw new Error("Invalid AUTH_MODE.");
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return async () => { throw new AuthenticationUnavailable(); };
  if (!key.startsWith("sb_publishable_")) throw new Error("Use a Supabase publishable key.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
  return async request => {
    const match = /^Bearer ([^\s]+)$/i.exec(request.get("Authorization") ?? "");
    if (!match) return null;
    const { data, error } = await client.auth.getUser(match[1]);
    if (error) {
      if (error.status === undefined || error.status >= 500) throw new AuthenticationUnavailable();
      return null;
    }
    // Never derive ownership from user-editable metadata or decode an unverified JWT.
    if (!data.user || data.user.is_anonymous) return null;
    return { id: data.user.id };
  };
}
