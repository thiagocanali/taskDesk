import { accessToken } from "../auth";

export class ApiError extends Error {
 constructor(message: string, readonly status = 0, readonly requestId: string | null = null) {
  super(message);
 }
}

export interface ApiRequestOptions extends RequestInit { timeoutMs?: number; }

/** No automatic retries: a timed-out mutation may already have committed. */
export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
 const { timeoutMs = 15000, signal: externalSignal, ...init } = options;
 const controller = new AbortController();
 let timedOut = false;
 let requestId: string | null = null;
 const cancel = () => controller.abort();
 const aborted = () => new DOMException("Requisição cancelada.", "AbortError");
 let rejectAbort!: () => void;
 const cancellation = new Promise<never>((_resolve, reject) => {
  rejectAbort = () => reject(aborted());
 });
 controller.signal.addEventListener("abort", rejectAbort, { once: true });
 externalSignal?.addEventListener("abort", cancel, { once: true });
 if (externalSignal?.aborted) cancel();
 const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
 const perform = async () => {
  if (controller.signal.aborted) throw aborted();
  const token = await accessToken();
  if (controller.signal.aborted) throw aborted();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers, signal: controller.signal });
  if (controller.signal.aborted) throw aborted();
  const id = response.headers.get("X-Request-ID");
  requestId = id && /^[a-f0-9-]{36}$/i.test(id) ? id : null;
  if (response.status === 401) window.dispatchEvent(new Event("taskdesk:unauthorized"));
  if (!response.ok) {
   const body: unknown = await response.json().catch(() => null);
   const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error : "Não foi possível concluir a operação.";
   throw new ApiError(message, response.status, requestId);
  }
  if (response.status === 204) return undefined as T;
  try { return await response.json() as T; }
  catch { throw new ApiError("O servidor retornou uma resposta inválida.", response.status, requestId); }
 };
 try { return await Promise.race([perform(), cancellation]); }
 catch (error) {
  if (externalSignal?.aborted) throw aborted();
  if (timedOut) throw new ApiError("A conexão demorou demais. Atualize os dados antes de tentar novamente.", 0, requestId);
  if (error instanceof ApiError) throw error;
  throw new ApiError("Não foi possível conectar. Verifique sua conexão e tente novamente.", 0, requestId);
 } finally {
  clearTimeout(timer);
  externalSignal?.removeEventListener("abort", cancel);
  controller.signal.removeEventListener("abort", rejectAbort);
 }
}
