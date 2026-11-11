import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";

const mocks=vi.hoisted(()=>({
 onAuthStateChange:vi.fn(), signInWithPassword:vi.fn(), signOut:vi.fn(), unsubscribe:vi.fn(),
}));
vi.mock("./auth",()=>({localMode:false,authClient:{auth:mocks}}));
vi.mock("./TaskDashboard.vue",()=>({default:{template:'<div data-testid="dashboard">Tarefas privadas</div>'}}));
let notify: (event:string,session:unknown)=>void;
const session={access_token:"token",user:{id:"user-1"}};

describe("account access",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  mocks.onAuthStateChange.mockImplementation(callback=>{
   notify=callback;
   callback("INITIAL_SESSION",null);
   return {data:{subscription:{unsubscribe:mocks.unsubscribe}}};
  });
 });
 it("keeps tasks hidden until a successful sign-in and clears the password",async()=>{
  mocks.signInWithPassword.mockResolvedValue({data:{session},error:null});
  const wrapper=mount(App);await flushPromises();
  expect(wrapper.find('[data-testid="dashboard"]').exists()).toBe(false);
  await wrapper.find("#login-email").setValue("person@example.test");
  await wrapper.find("#login-password").setValue("test-password");
  await wrapper.find("form").trigger("submit");await flushPromises();
  expect(mocks.signInWithPassword).toHaveBeenCalledWith({email:"person@example.test",password:"test-password"});
  expect(wrapper.text()).toContain("Tarefas privadas");
  mocks.signOut.mockResolvedValue({error:null});
  await wrapper.find("button").trigger("click");await flushPromises();
  expect(wrapper.find('[data-testid="dashboard"]').exists()).toBe(false);
  expect((wrapper.find("#login-password").element as HTMLInputElement).value).toBe("");
  wrapper.unmount();expect(mocks.unsubscribe).toHaveBeenCalledOnce();
 });
 it("shows generic login failures and removes private views on session expiry",async()=>{
  mocks.signInWithPassword.mockResolvedValue({error:new Error("sensitive provider details")});
  const wrapper=mount(App);await flushPromises();
  await wrapper.find("form").trigger("submit");await flushPromises();
  expect(wrapper.text()).toContain("Não foi possível entrar.");
  expect(wrapper.text()).not.toContain("sensitive provider details");
  notify("SIGNED_IN",session);await flushPromises();
  expect(wrapper.text()).toContain("Tarefas privadas");
  window.dispatchEvent(new Event("taskdesk:unauthorized"));await flushPromises();
  expect(wrapper.find('[data-testid="dashboard"]').exists()).toBe(false);
  expect(wrapper.text()).toContain("Sua sessão expirou.");
  wrapper.unmount();
 });
});
