import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearNeonSession, neonRegister, neonRestore, neonSignIn, neonSignOut, neonToken } from "./auth";

describe("Neon browser auth",()=>{
 beforeEach(()=>{window.sessionStorage.clear();vi.restoreAllMocks();});
 it("registers without persisting passwords",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({data:{id:"u1",email:"user@example.test"}}),{status:201}));
  await neonRegister("user@example.test","long-safe-password");
  expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/auth/register");
  expect(window.sessionStorage.length).toBe(0);
 });
 it("persists a session only in sessionStorage and clears it on logout",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({data:{token:"a".repeat(64),user:{id:"u1",email:"user@example.test"}}}),{status:200}))
   .mockResolvedValueOnce(new Response(null,{status:204}));
  const user=await neonSignIn("user@example.test","long-safe-password");
  expect(user.id).toBe("u1");
  expect(neonToken()).toBe("a".repeat(64));
  await neonSignOut();
  expect(neonToken()).toBeNull();
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({Authorization:`Bearer ${"a".repeat(64)}`});
 });
 it("clears an expired session after a failed identity check",async()=>{
  window.sessionStorage.setItem("taskdesk:neon-token","a".repeat(64));
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({error:"expired"}),{status:401}));
  expect(await neonRestore()).toBeNull();
  expect(neonToken()).toBeNull();
  clearNeonSession();
 });
 it("clears the local token before logout completes, preserving the bearer for revocation",async()=>{
  const token="b".repeat(64);
  window.sessionStorage.setItem("taskdesk:neon-token",token);
  let rejectLogout!: (reason:Error)=>void;
  const fetchMock=vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise((_resolve,reject)=>{rejectLogout=reject;}));
  const operation=neonSignOut();
  const result=operation.catch(error=>error);
  const tokenWhilePending=neonToken();
  rejectLogout(new Error("synthetic network failure"));
  expect(await result).toBeInstanceOf(Error);
  expect(tokenWhilePending).toBeNull();
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({Authorization:`Bearer ${token}`});
  expect(neonToken()).toBeNull();
 });


 it.each([429, 500, 503, 403])("preserves the token when restoration returns HTTP %s",async status=>{
  const token="c".repeat(64);
  window.sessionStorage.setItem("taskdesk:neon-token",token);
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("temporary failure",{status}));
  await expect(neonRestore()).rejects.toThrow();
  expect(neonToken()).toBe(token);
 });
 it.each([new TypeError("network failure"),new DOMException("timeout","TimeoutError")])("preserves the token after a transport failure and restores it on retry",async failure=>{
  const token="c".repeat(64);
  window.sessionStorage.setItem("taskdesk:neon-token",token);
  const fetchMock=vi.spyOn(globalThis,"fetch").mockRejectedValueOnce(failure)
   .mockResolvedValueOnce(new Response(JSON.stringify({data:{id:"u1",email:"user@example.test"}})));
  await expect(neonRestore()).rejects.toThrow();
  expect(neonToken()).toBe(token);
  expect(await neonRestore()).toEqual({id:"u1",email:"user@example.test"});
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({Authorization:"Bearer "+token});
  expect(neonToken()).toBe(token);
 });
 it("keeps the token while identity confirmation is pending",async()=>{
  const token="d".repeat(64);
  window.sessionStorage.setItem("taskdesk:neon-token",token);
  let resolve!: (response:Response)=>void;
  vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const operation=neonRestore();
  expect(neonToken()).toBe(token);
  resolve(new Response(JSON.stringify({data:{id:"u1",email:"user@example.test"}})));
  expect(await operation).toMatchObject({id:"u1"});
 });
 it("does not delete a replacement token after an old request returns 401",async()=>{
  window.sessionStorage.setItem("taskdesk:neon-token","old-token");
  let resolve!: (response:Response)=>void;
  vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const operation=neonRestore();
  window.sessionStorage.setItem("taskdesk:neon-token","replacement-token");
  resolve(new Response(null,{status:401}));
  expect(await operation).toBeNull();
  expect(neonToken()).toBe("replacement-token");
 });
});
