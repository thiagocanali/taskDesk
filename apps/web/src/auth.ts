import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const neonMode = import.meta.env.VITE_AUTH_MODE === "neon";
export const registrationEnabled = neonMode && import.meta.env.VITE_AUTH_ALLOW_REGISTRATION === "true";
const neonTokenKey = "taskdesk:neon-token";
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
export function neonToken() { return window.sessionStorage.getItem(neonTokenKey); }
export function clearNeonSession() { window.sessionStorage.removeItem(neonTokenKey); }
class AuthRequestError extends Error {
 constructor(readonly status:number) {
  super(status===429?"Muitas tentativas. Aguarde e tente novamente.":"Não foi possível autenticar.");
 }
}
export async function neonRequest<T>(path: string, options?: RequestInit): Promise<T> {
 const token = neonToken();
 const response = await fetch(`${apiBase}/api/v1/auth${path}`,{
  ...options, signal:options?.signal ?? AbortSignal.timeout(8000), headers:{"Content-Type":"application/json",...options?.headers,...(token?{Authorization:`Bearer ${token}`}:{})}
 });
 if (!response.ok) throw new AuthRequestError(response.status);
 return response.status===204?undefined as T:response.json() as Promise<T>;
}
export async function neonSignIn(email:string,password:string) {
 const response = await neonRequest<{data:{token:string;user:{id:string;email:string}}}>("/login",{method:"POST",body:JSON.stringify({email,password})});
 window.sessionStorage.setItem(neonTokenKey,response.data.token);
 return response.data.user;
}
export async function neonRegister(email:string,password:string) {
 return neonRequest<{data:{id:string;email:string}}>("/register",{method:"POST",body:JSON.stringify({email,password})});
}
export async function neonRestore() {
 const token=neonToken();
 if(!token) return null;
 try {
  const response=await neonRequest<{data:{id:string;email:string}}>("/me");
  return neonToken()===token?response.data:null;
 } catch(error) {
  // An old response must not invalidate a session established in the meantime.
  if(neonToken()!==token) return null;
  if(error instanceof AuthRequestError && error.status===401) {
   clearNeonSession();
   return null;
  }
  // Transport failures, throttling and server errors do not prove expiry.
  throw error;
 }
}
export async function neonSignOut() {
 const token = neonToken();
 clearNeonSession();
 // The captured token is only used to revoke the session being closed.
 await neonRequest("/logout",{method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{}});
}
export const localMode = import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === "local";
export const authClient = !neonMode && url && key?.startsWith("sb_publishable_") ? createClient(url, key, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
}) : null;

export async function accessToken(): Promise<string | null> {
  if (neonMode) return neonToken();
  if (!authClient) return null;
  const { data, error } = await authClient.auth.getSession();
  if (error || !data.session) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.session.access_token;
}
