import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";

const mocks = vi.hoisted(() => ({enabled:false,register:vi.fn(),login:vi.fn(),restore:vi.fn()}));
vi.mock("./auth", () => ({
 localMode:false, neonMode:true, authClient:null,
 get registrationEnabled() { return mocks.enabled; },
 neonRegister:mocks.register, neonSignIn:mocks.login, neonRestore:mocks.restore,
 neonSignOut:vi.fn(), clearNeonSession:vi.fn(),
}));
vi.mock("./TaskDashboard.vue", () => ({default:{template:"<div>Tarefas privadas</div>"}}));

describe("registration entry point", () => {
 beforeEach(() => {vi.clearAllMocks();mocks.enabled=false;mocks.restore.mockResolvedValue(null);});
 it("only offers login by default", async () => {
  const wrapper=mount(App);await flushPromises();
  expect(wrapper.findAll("button")).toHaveLength(1);
  expect(wrapper.text()).not.toContain("Criar conta");
  wrapper.unmount();
 });
 it("uses separate buttons and only registers on form submission", async () => {
  mocks.enabled=true;
  mocks.register.mockResolvedValue({data:{id:"u1",email:"user@example.test"}});
  mocks.login.mockResolvedValue({id:"u1",email:"user@example.test"});
  const wrapper=mount(App);await flushPromises();
  expect(wrapper.findAll("form > button")).toHaveLength(2);
  expect(wrapper.find("button button").exists()).toBe(false);
  await wrapper.get('button[type="button"]').trigger("click");
  expect(mocks.register).not.toHaveBeenCalled();
  await wrapper.get("#login-email").setValue("user@example.test");
  await wrapper.get("#login-password").setValue("long-example-password");
  await wrapper.get("form").trigger("submit");await flushPromises();
  expect(mocks.register).toHaveBeenCalledExactlyOnceWith("user@example.test","long-example-password");
  expect(mocks.login).toHaveBeenCalledOnce();
  wrapper.unmount();
 });
});
