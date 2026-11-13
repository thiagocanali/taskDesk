import { activityMessage } from "./task-activity.js";
import { describe,expect,it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import type { CreateTaskInput,ListTaskFilters,TaskActivityRecord,TaskRecord,TaskRepository,UpdateTaskInput } from "./task.types.js";
class InMemoryTaskRepository implements TaskRepository {
 private tasks:TaskRecord[]=[];
 private activities:TaskActivityRecord[]=[];
 private sequence=0;
 async list(filters:ListTaskFilters):Promise<TaskRecord[]> {
  return this.tasks.filter(task=>(!filters.status||task.status===filters.status)&&(!filters.priority||task.priority===filters.priority));
 }
 async listActivities(taskId:string):Promise<TaskActivityRecord[]>{return this.activities.filter(activity=>activity.taskId===taskId);}
 async addActivity(taskId:string,type:string,message:string):Promise<TaskActivityRecord>{const activity={id:`activity-${this.activities.length+1}`,taskId,type,message,createdAt:new Date()};this.activities.push(activity);return activity;}
 async findById(id:string):Promise<TaskRecord|null>{return this.tasks.find(task=>task.id===id)??null;}
 async create(input:CreateTaskInput):Promise<TaskRecord>{
  const now=new Date(); const task:TaskRecord={id:`task-${++this.sequence}`,title:input.title,description:input.description??null,status:"NEW",priority:input.priority??"NORMAL",dueAt:input.dueAt??null,origin:input.origin??null,isDemo:false,createdAt:now,updatedAt:now};
  this.tasks.push(task);await this.addActivity(task.id,"CREATED","Tarefa criada.");return task;
 }
 async update(id:string,input:UpdateTaskInput):Promise<TaskRecord|null>{
  const index=this.tasks.findIndex(task=>task.id===id);if(index<0)return null;
  const updated={...this.tasks[index],...input,updatedAt:new Date()};for(const field of Object.keys(input) as (keyof UpdateTaskInput)[]){const message=activityMessage(field,this.tasks[index]!,updated as TaskRecord);if(message)await this.addActivity(id,"FIELD_UPDATED",message);}
  this.tasks[index]=updated;return updated;
 }
 async delete(id:string):Promise<boolean>{const count=this.tasks.length;this.tasks=this.tasks.filter(task=>task.id!==id);return this.tasks.length<count;}
}
describe("task endpoints",()=>{
 const repository=new InMemoryTaskRepository();const app=createApp({authenticate:async()=>({id:"test-user"}),taskRepository:repository});
 it("creates a task with safe defaults",async()=>{
  const response=await request(app).post("/api/v1/tasks").send({title:"  Preparar relatório  "});
  expect(response.status).toBe(201);expect(response.body.data).toMatchObject({title:"Preparar relatório",status:"NEW",priority:"NORMAL",isDemo:false});
  const activities=await request(app).get(`/api/v1/tasks/${response.body.data.id}/activities`);
  expect(activities.status).toBe(200);expect(activities.body.data).toHaveLength(1);expect(activities.body.data[0]).toMatchObject({type:"CREATED"});
 });
 it("rejects invalid task data",async()=>{const response=await request(app).post("/api/v1/tasks").send({title:"   ",unexpected:true});expect(response.status).toBe(400);});
 it("lists tasks and supports filters",async()=>{const response=await request(app).get("/api/v1/tasks?status=NEW");expect(response.status).toBe(200);expect(response.body.data).toHaveLength(1);});
 it("validates pagination bounds without changing existing list responses",async()=>{
  const valid=await request(app).get("/api/v1/tasks?page=1&limit=20&status=NEW");
  expect(valid.status).toBe(200);
  expect(valid.body.data).toEqual(expect.any(Array));
  for(const query of ["page=0","page=-1","page=1.5","limit=0","limit=101","page=abc"]){
   const invalid=await request(app).get("/api/v1/tasks?"+query);
   expect(invalid.status).toBe(400);
  }
 });
 it("records the previous and new status in task history",async()=>{
  const response=await request(app).patch("/api/v1/tasks/task-1").send({status:"IN_PROGRESS"});
  expect(response.status).toBe(200);expect(response.body.data.status).toBe("IN_PROGRESS");
  const activities=await request(app).get("/api/v1/tasks/task-1/activities");
  expect(activities.body.data).toContainEqual(expect.objectContaining({type:"FIELD_UPDATED",message:"Status: Nova → Em andamento"}));
 });
 it("records priority changes and ignores fields that did not change",async()=>{
  const response=await request(app).patch("/api/v1/tasks/task-1").send({priority:"HIGH"});
  expect(response.status).toBe(200);
  const activities=await request(app).get("/api/v1/tasks/task-1/activities");
  expect(activities.body.data).toContainEqual(expect.objectContaining({type:"FIELD_UPDATED",message:"Prioridade: Normal → Alta"}));
  const countBefore=activities.body.data.length;
  await request(app).patch("/api/v1/tasks/task-1").send({priority:"HIGH"});
  const afterNoop=await request(app).get("/api/v1/tasks/task-1/activities");
  expect(afterNoop.body.data).toHaveLength(countBefore);
 });
 it("returns 404 for an unknown task",async()=>{const response=await request(app).get("/api/v1/tasks/missing");expect(response.status).toBe(404);});
 it("deletes a task explicitly",async()=>{const response=await request(app).delete("/api/v1/tasks/task-1");expect(response.status).toBe(204);expect(await repository.findById("task-1")).toBeNull();});
 it("rejects unsupported filters and empty or unknown update fields",async()=>{
  const invalidFilter=await request(app).get("/api/v1/tasks?status=INVALID");
  expect(invalidFilter.status).toBe(400);
  const emptyUpdate=await request(app).patch("/api/v1/tasks/task-1").send({});
  expect(emptyUpdate.status).toBe(400);
  const unknownField=await request(app).patch("/api/v1/tasks/task-1").send({isAdmin:true});
  expect(unknownField.status).toBe(400);
 });
 it("returns 404 for missing task updates, deletion, and activity history",async()=>{
  const update=await request(app).patch("/api/v1/tasks/does-not-exist").send({status:"COMPLETED"});
  const deletion=await request(app).delete("/api/v1/tasks/does-not-exist");
  const history=await request(app).get("/api/v1/tasks/does-not-exist/activities");
  expect(update.status).toBe(404);
  expect(deletion.status).toBe(404);
  expect(history.status).toBe(404);
 });
 it("rejects invalid dates and unexpected query parameters",async()=>{
  const invalidDate=await request(app).post("/api/v1/tasks").send({title:"Tarefa com data inválida",dueAt:"not-a-date"});
  const unexpectedQuery=await request(app).get("/api/v1/tasks?owner=someone");
  expect(invalidDate.status).toBe(400);
  expect(unexpectedQuery.status).toBe(400);
 });
});

describe("task validation contract",()=>{
 it.each([
  {title:"x".repeat(161)},
  {title:"Valid",description:"x".repeat(5001)},
  {title:"Valid",dueAt:"2026-02-30T12:00:00.000Z"},
  {title:"Valid",ownerId:"11111111-1111-4111-8111-111111111111"},
  {title:42},
 ])("rejects invalid boundary input without changing the error response contract",async payload=>{
  const app=createApp({authenticate:async()=>({id:"test-user"}),taskRepository:new InMemoryTaskRepository()});
  const response=await request(app).post("/api/v1/tasks").send(payload);
  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({error:"Dados da tarefa inválidos.",details:{formErrors:expect.any(Array),fieldErrors:expect.any(Object)}});
 });
 it("accepts maximum-length fields and offset timestamps",async()=>{
  const app=createApp({authenticate:async()=>({id:"test-user"}),taskRepository:new InMemoryTaskRepository()});
  const response=await request(app).post("/api/v1/tasks").send({title:"x".repeat(160),description:"x".repeat(5000),dueAt:"2026-11-11T12:00:00-03:00"});
  expect(response.status).toBe(201);
  expect(response.body.data.dueAt).toBe("2026-11-11T15:00:00.000Z");
 });
});
