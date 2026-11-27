import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessToken } from "../auth";
import { ApiError, apiRequest } from "./api";

vi.mock("../auth",()=>({accessToken:vi.fn()}));
describe("API transport",()=>{
 beforeEach(()=>{vi.mocked(accessToken).mockResolvedValue("session-token");});
 afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
 it("attaches the selected session and preserves custom headers and JSON contracts",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({data:[{id:"t1"}]})));
  expect(await apiRequest("/api/v1/tasks",{headers:new Headers({"X-Test":"value"})})).toEqual({data:[{id:"t1"}]});
  const headers=fetchMock.mock.calls[0][1]?.headers as Headers;
  expect(headers.get("Authorization")).toBe("Bearer session-token");
  expect(headers.get("Content-Type")).toBe("application/json");
  expect(headers.get("X-Test")).toBe("value");
 });
 it("supports a successful empty response",async()=>{
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(null,{status:204}));
  expect(await apiRequest("/api/v1/tasks/t1",{method:"DELETE"})).toBeUndefined();
 });
 it("retains server correlation metadata without including it in the user message",async()=>{
  const requestId="11111111-1111-4111-8111-111111111111";
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({error:"Não foi possível salvar."}),{status:500,headers:{"X-Request-ID":requestId}}));
  await expect(apiRequest("/api/v1/tasks")).rejects.toMatchObject({message:"Não foi possível salvar.",status:500,requestId});
 });
 it("invalidates the dashboard session on a definitive unauthorized response",async()=>{
  const unauthorized=vi.fn();window.addEventListener("taskdesk:unauthorized",unauthorized);
  try {
   vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(null,{status:401}));
   await expect(apiRequest("/api/v1/tasks")).rejects.toMatchObject({status:401});
   expect(unauthorized).toHaveBeenCalledOnce();
  } finally {window.removeEventListener("taskdesk:unauthorized",unauthorized);}
 });
 it("bounds waiting for credentials and never sends a late request after timeout",async()=>{
  vi.useFakeTimers();
  let resolve!: (value:string)=>void;
  vi.mocked(accessToken).mockReturnValue(new Promise(done=>{resolve=done;}));
  const fetchMock=vi.spyOn(globalThis,"fetch");
  const operation=apiRequest("/api/v1/tasks",{timeoutMs:10});
  const assertion=expect(operation).rejects.toMatchObject({status:0,message:expect.stringContaining("demorou demais")});
  await vi.advanceTimersByTimeAsync(10);await assertion;
  resolve("session-token");await Promise.resolve();
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("does not automatically retry a timed-out mutation",async()=>{
  vi.useFakeTimers();
  const fetchMock=vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(()=>{}));
  const operation=apiRequest("/api/v1/tasks",{method:"POST",body:JSON.stringify({title:"Task"}),timeoutMs:10});
  const assertion=expect(operation).rejects.toBeInstanceOf(ApiError);
  await vi.advanceTimersByTimeAsync(10);await assertion;
  expect(fetchMock).toHaveBeenCalledOnce();
  expect((fetchMock.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
 });
 it("bounds waiting for an unfinished response body",async()=>{
  vi.useFakeTimers();
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new ReadableStream()));
  const operation=apiRequest("/api/v1/tasks",{timeoutMs:10});
  const assertion=expect(operation).rejects.toMatchObject({status:0,message:expect.stringContaining("demorou demais")});
  await vi.advanceTimersByTimeAsync(10);await assertion;
 });
 it("cancels superseded reads and ignores their late 401 responses",async()=>{
  const controller=new AbortController();
  const unauthorized=vi.fn();window.addEventListener("taskdesk:unauthorized",unauthorized);
  let resolve!: (value:Response)=>void;
  vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(done=>{resolve=done;}));
  try {
   const operation=apiRequest("/api/v1/tasks",{signal:controller.signal});
   const assertion=expect(operation).rejects.toMatchObject({name:"AbortError"});
   await Promise.resolve();controller.abort();await assertion;
   resolve(new Response(null,{status:401}));await Promise.resolve();
   expect(unauthorized).not.toHaveBeenCalled();
  } finally {window.removeEventListener("taskdesk:unauthorized",unauthorized);}
 });
 it("handles invalid server JSON and transport failures with safe messages",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("not-json"))
   .mockRejectedValueOnce(new Error("private network detail"));
  await expect(apiRequest("/api/v1/tasks")).rejects.toMatchObject({message:"O servidor retornou uma resposta inválida."});
  await expect(apiRequest("/api/v1/tasks")).rejects.toMatchObject({message:expect.not.stringContaining("private network detail")});
 });
});
