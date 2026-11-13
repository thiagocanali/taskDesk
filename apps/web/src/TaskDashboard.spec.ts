import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./TaskDashboard.vue";

type Task = { id:string;title:string;description:string|null;status:"NEW"|"IN_PROGRESS"|"WAITING"|"COMPLETED";priority:"LOW"|"NORMAL"|"HIGH"|"URGENT";dueAt:string|null;origin:string|null;isDemo:boolean;createdAt:string;updatedAt:string };
function makeTask(id:string,title:string,overrides:Partial<Task>={}):Task {
 return {id,title,description:null,status:"NEW",priority:"NORMAL",dueAt:null,origin:null,isDemo:false,createdAt:"2026-11-01T12:00:00.000Z",updatedAt:"2026-11-01T12:00:00.000Z",...overrides};
}
function response(data:unknown,status=200):Response {return {ok:status>=200&&status<300,status,json:async()=>data} as Response;}
let items:Task[];
let fetchMock:ReturnType<typeof vi.fn>;
let failure:string|null;
let historyFailure:string|null;
let listRequests:string[];
function summary() {return {total:items.length,inProgress:items.filter(t=>t.status==="IN_PROGRESS").length,waiting:items.filter(t=>t.status==="WAITING").length,completed:items.filter(t=>t.status==="COMPLETED").length,overdue:0,dueSoon:0};}
async function render(){const wrapper=mount(App);await flushPromises();return wrapper;}
describe("task dashboard with paginated API",()=>{
 beforeEach(()=>{
  vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(new Date("2026-11-08T12:00:00.000Z"));
  items=[];failure=null;historyFailure=null;listRequests=[];
  fetchMock=vi.fn(async (url:string,options?:RequestInit)=>{
   if(url.includes("/tasks/summary")) return response({data:summary()});
   if(url.includes("/tasks?")){
    listRequests.push(url);
    if(failure) return response({error:failure},500);
    const query=new URL(url,"https://example.test").searchParams;
    const filtered=items.filter(t=>(!query.has("status")||t.status===query.get("status"))&&(!query.has("priority")||t.priority===query.get("priority")));
    const page=Number(query.get("page")??1),limit=Number(query.get("limit")??25);
    return response({data:filtered.slice((page-1)*limit,page*limit),pagination:{page,limit,total:filtered.length,totalPages:Math.ceil(filtered.length/limit)}});
   }
   if(url.endsWith("/activities")){
    if(historyFailure) return response({error:historyFailure},500);
    return response({data:[{id:"a1",taskId:"task-1",type:"CREATED",message:"Tarefa criada.",createdAt:"2026-11-08T10:00:00.000Z"}]});
   }
   if(options?.method==="POST"){
    const body=JSON.parse(options.body as string) as Partial<Task>;
    const task=makeTask("created",body.title??"Nova tarefa",body);
    items.unshift(task);return response({data:task},201);
   }
   if(options?.method==="PATCH"){
    const id=url.split("/").pop();const body=JSON.parse(options.body as string) as Partial<Task>;
    const index=items.findIndex(t=>t.id===id);items[index]={...items[index]!,...body};return response({data:items[index]});
   }
   if(options?.method==="DELETE"){
    const id=url.split("/").pop();items=items.filter(t=>t.id!==id);return response(null,204);
   }
   return response({error:"Unexpected request"},404);
  });
  vi.stubGlobal("fetch",fetchMock);
 });
 afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();vi.restoreAllMocks();});
 it("loads summary separately from first page and loads more without duplicates",async()=>{
  items=Array.from({length:28},(_,i)=>makeTask("task-"+i,"Tarefa "+i));
  const wrapper=await render();
  expect(wrapper.findAll(".task-card")).toHaveLength(25);
  expect(wrapper.text()).toContain("28");
  await wrapper.find(".task-pagination button").trigger("click");await flushPromises();
  expect(wrapper.findAll(".task-card")).toHaveLength(28);
  expect(new Set(wrapper.findAll(".task-card").map(c=>c.attributes("key"))).size).toBe(28);
  expect(listRequests[1]).toContain("page=2");
 });
 it("applies both filters server-side and preserves global counts",async()=>{
  items=[makeTask("task-1","Alta em andamento",{status:"IN_PROGRESS",priority:"HIGH"}),makeTask("task-2","Normal em andamento",{status:"IN_PROGRESS"}),makeTask("task-3","Alta concluída",{status:"COMPLETED",priority:"HIGH"})];
  const wrapper=await render();
  await wrapper.find("#status-filter").setValue("IN_PROGRESS");
  await wrapper.find("#priority-filter").setValue("HIGH");await flushPromises();
  expect(wrapper.findAll(".task-card")).toHaveLength(1);
  expect(wrapper.text()).toContain("Alta em andamento");
  expect(wrapper.text()).not.toContain("Normal em andamento");
  expect(listRequests.at(-1)).toContain("status=IN_PROGRESS");
  expect(listRequests.at(-1)).toContain("priority=HIGH");
 });
 it("reports API errors and retries without presenting stale tasks",async()=>{
  failure="API indisponível";
  const wrapper=await render();
  expect(wrapper.text()).toContain("API indisponível");
  expect(wrapper.findAll(".task-card")).toHaveLength(0);
  failure=null;
  await wrapper.find(".feedback-error .text-button").trigger("click");await flushPromises();
  expect(wrapper.text()).toContain("Seu espaço ainda está vazio.");
 });
 it("creates, edits, changes status and deletes tasks with refreshed counts",async()=>{
  items=[makeTask("task-1","Original")];
  const wrapper=await render();
  await wrapper.find("#task-title").setValue("Nova tarefa");
  await wrapper.find("form.task-form").trigger("submit");await flushPromises();
  expect(wrapper.text()).toContain("Tarefa criada com sucesso.");
  expect(wrapper.findAll(".task-card")).toHaveLength(2);
  await wrapper.find(".task-status-select").setValue("IN_PROGRESS");await flushPromises();
  expect(wrapper.text()).toContain("Status atualizado.");
  await wrapper.find(".task-card .secondary-button").trigger("click");
  const edit=wrapper.find("form.edit-form");
  await edit.find("input[type=text]").setValue("Título editado");
  await edit.trigger("submit");await flushPromises();
  expect(wrapper.text()).toContain("Tarefa atualizada.");
  vi.spyOn(window,"confirm").mockReturnValue(true);
  await wrapper.find(".danger-button").trigger("click");await flushPromises();
  expect(wrapper.text()).toContain("Tarefa excluída.");
  expect(wrapper.findAll(".task-card")).toHaveLength(1);
 });
 it("keeps task history independent of paginated summary",async()=>{
  items=[makeTask("task-1","Histórico")];
  const wrapper=await render();
  await wrapper.findAll("button").find(b=>b.text()==="Histórico")!.trigger("click");await flushPromises();
  expect(wrapper.text()).toContain("Tarefa criada.");
  expect(fetchMock.mock.calls.some(([url])=>String(url).endsWith("/activities"))).toBe(true);
 });
 it("shows a scoped history failure and permits retry",async()=>{
  items=[makeTask("task-1","Histórico")];historyFailure="Histórico indisponível";
  const wrapper=await render();
  await wrapper.findAll("button").find(b=>b.text()==="Histórico")!.trigger("click");await flushPromises();
  expect(wrapper.text()).toContain("Histórico indisponível");
  historyFailure=null;
  await wrapper.find(".activity-error .text-button").trigger("click");await flushPromises();
  expect(wrapper.text()).toContain("Tarefa criada.");
 });
 it("does not delete a task if confirmation is cancelled",async()=>{
  items=[makeTask("task-1","Manter tarefa")];
  vi.spyOn(window,"confirm").mockReturnValue(false);
  const wrapper=await render();
  await wrapper.find(".danger-button").trigger("click");await flushPromises();
  expect(items).toHaveLength(1);
  expect(wrapper.text()).toContain("Manter tarefa");
 });
});
