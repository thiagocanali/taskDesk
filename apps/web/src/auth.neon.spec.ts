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
});
