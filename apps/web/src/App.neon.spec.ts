import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";

const mocks = vi.hoisted(() => ({
 restore: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock("./auth", () => ({
 localMode:false, neonMode:true, registrationEnabled:false,
 neonRestore:mocks.restore, neonSignOut:mocks.signOut,
 neonSignIn:vi.fn(), neonRegister:vi.fn(), clearNeonSession:vi.fn(),
 // Stale Supabase configuration must not become a second identity source.
 authClient:{auth:{onAuthStateChange:mocks.onAuthStateChange}},
}));
vi.mock("./TaskDashboard.vue", () => ({default:{template:'<div data-testid="private-dashboard">Tarefas privadas</div>'}}));

describe("independent account logout", () => {
 beforeEach(() => {
  vi.clearAllMocks();
  mocks.restore.mockResolvedValue({id:"user-1",email:"user@example.test"});
  mocks.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:mocks.unsubscribe}}});
 });
 it("does not subscribe to another provider while independent auth is selected", async () => {
  const wrapper=mount(App);await flushPromises();
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(true);
  expect(mocks.onAuthStateChange).not.toHaveBeenCalled();
  wrapper.unmount();
 });
 it("removes private views before a slow logout response and stays signed out on failure", async () => {
  let rejectLogout!: (reason: Error) => void;
  mocks.signOut.mockImplementation(() => new Promise((_resolve,reject) => {rejectLogout=reject;}));
  const wrapper=mount(App);await flushPromises();
  await wrapper.get("button").trigger("click");
  const dashboardWhilePending=wrapper.find('[data-testid="private-dashboard"]').exists();
  rejectLogout(new Error("sensitive provider details"));await flushPromises();
  expect(dashboardWhilePending).toBe(false);
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(false);
  expect(wrapper.text()).toContain("Você saiu deste dispositivo.");
  expect(wrapper.text()).not.toContain("sensitive provider details");
  expect((wrapper.get("#login-password").element as HTMLInputElement).value).toBe("");
  expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeUndefined();
  wrapper.unmount();
 });

 it.each(["button","online"])("keeps private views hidden after a failed restore and recovers via %s",async trigger=>{
  mocks.restore.mockRejectedValueOnce(new Error("sensitive network details"))
   .mockResolvedValueOnce({id:"user-1",email:"user@example.test"});
  const wrapper=mount(App); await flushPromises();
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(false);
  expect(wrapper.find("form").exists()).toBe(false);
  expect(wrapper.text()).toContain("Não foi possível verificar sua sessão.");
  expect(wrapper.text()).not.toContain("sensitive network details");
  if(trigger==="online") window.dispatchEvent(new Event("online"));
  else await wrapper.get('[data-testid="retry-session"]').trigger("click");
  await flushPromises();
  expect(mocks.restore).toHaveBeenCalledTimes(2);
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(true);
  wrapper.unmount();
 });
 it("shows login only when restoration confirms no valid session",async()=>{
  mocks.restore.mockResolvedValueOnce(null);
  const wrapper=mount(App); await flushPromises();
  expect(wrapper.find("form").exists()).toBe(true);
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(false);
  wrapper.unmount();
 });
 it("does not restore private views from a stale response after invalidation",async()=>{
  let resolve!: (value:{id:string;email:string})=>void;
  mocks.restore.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  const wrapper=mount(App);
  window.dispatchEvent(new Event("taskdesk:unauthorized"));
  resolve({id:"user-1",email:"user@example.test"}); await flushPromises();
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(false);
  expect(wrapper.find("form").exists()).toBe(true);
  wrapper.unmount();
 });

 it("deduplicates reconnect attempts and removes the reconnect listener on unmount",async()=>{
  let resolve!: (value:{id:string;email:string})=>void;
  mocks.restore.mockRejectedValueOnce(new Error("offline"))
   .mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  const wrapper=mount(App); await flushPromises();
  window.dispatchEvent(new Event("online"));
  window.dispatchEvent(new Event("online")); await flushPromises();
  expect(mocks.restore).toHaveBeenCalledTimes(2);
  expect(wrapper.text()).toContain("Verificando sua sessão...");
  expect(wrapper.find('[data-testid="private-dashboard"]').exists()).toBe(false);
  wrapper.unmount();
  window.dispatchEvent(new Event("online"));
  expect(mocks.restore).toHaveBeenCalledTimes(2);
  resolve({id:"user-1",email:"user@example.test"}); await flushPromises();
 });
});
