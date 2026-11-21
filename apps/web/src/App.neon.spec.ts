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
});
